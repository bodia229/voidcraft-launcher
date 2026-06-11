package com.voidcraft.coremod;

import net.minecraft.launchwrapper.IClassTransformer;
import org.objectweb.asm.ClassReader;
import org.objectweb.asm.ClassWriter;
import org.objectweb.asm.Opcodes;
import org.objectweb.asm.tree.AbstractInsnNode;
import org.objectweb.asm.tree.ClassNode;
import org.objectweb.asm.tree.FieldInsnNode;
import org.objectweb.asm.tree.InsnList;
import org.objectweb.asm.tree.InsnNode;
import org.objectweb.asm.tree.LdcInsnNode;
import org.objectweb.asm.tree.MethodInsnNode;
import org.objectweb.asm.tree.MethodNode;
import org.objectweb.asm.tree.TypeInsnNode;
import org.objectweb.asm.tree.VarInsnNode;

/**
 * Two-pronged hijack of the Mojang white splash on Minecraft 1.12.2:
 *
 *  1. In {@code net.minecraft.client.Minecraft.startGame()} (SRG name
 *     {@code func_71384_a}), we inject a {@code GL11.glClearColor(0,0,0,1)}
 *     call right at the top, so the very first frame the window paints is
 *     black instead of the default white the window manager hands out.
 *
 *  2. In {@code net.minecraft.client.renderer.texture.TextureManager
 *     .bindTexture(ResourceLocation)} (SRG name {@code func_110577_a}), we
 *     short-circuit any bind targeting the Mojang silhouette texture
 *     {@code minecraft:textures/gui/title/mojang.png}. Binding nothing means
 *     subsequent draw calls render with no texture, so the silhouette never
 *     appears on screen.
 */
public class NoMojangTransformer implements IClassTransformer, Opcodes {

    private static final String MINECRAFT_CLASS = "net.minecraft.client.Minecraft";
    private static final String TEXTURE_MANAGER_CLASS = "net.minecraft.client.renderer.texture.TextureManager";
    private static final String SPLASH_PROGRESS_CLASS = "net.minecraftforge.fml.client.SplashProgress";

    @Override
    public byte[] transform(String name, String transformedName, byte[] basicClass) {
        if (basicClass == null) return null;

        if (MINECRAFT_CLASS.equals(transformedName)) {
            return patchMinecraft(basicClass);
        }
        if (TEXTURE_MANAGER_CLASS.equals(transformedName)) {
            return patchTextureManager(basicClass);
        }
        // Patch every SplashProgress class (incl. inner) to redirect the
        // LDC string "textures/gui/title/mojang.png" -> "voidcraft_splash
        // .png". MC's jar doesn't have voidcraft_splash.png so the
        // classloader falls through to our coremod jar, which DOES, and
        // SplashProgress draws our texture as the silhouette quad.
        if (transformedName.startsWith(SPLASH_PROGRESS_CLASS)) {
            return patchSplashProgress(basicClass);
        }
        return basicClass;
    }

    /**
     * Forge's FML splash thread draws the Mojang silhouette via
     * {@code SplashProgress.logoTexture.bind()} followed by a GL_QUADS block.
     * We can't easily skip the quad without breaking stack balance, so we
     * make {@code bind()} a no-op for the logoTexture by simply NOP-ing the
     * GETSTATIC + INVOKEVIRTUAL pair. The subsequent draw still emits a
     * quad but it's textured with whatever was previously bound — for the
     * very first frames that's nothing, so the screen stays black.
     */
    private byte[] patchSplashProgress(byte[] basicClass) {
        ClassReader cr = new ClassReader(basicClass);
        ClassNode cn = new ClassNode();
        cr.accept(cn, 0);

        // Three-pronged attack — different patches catch the silhouette at
        // different layers in case bind() NOPs aren't enough (Texture
        // constructor may already bind internally):
        //   A. NOP every Texture.bind() call.
        //   B. Rewrite the LDC string "textures/gui/title/mojang.png" to
        //      "voidcraft/nothing.png" so the texture loader fails and the
        //      Texture object holds no GL handle.
        //   C. NOP glBegin(GL_QUADS) calls inside this class family so even
        //      if texture state persists, the quad never gets emitted.
        int patches = 0;
        int redirected = 0;
        int glBeginNopped = 0;
        int vReplaced = 0;
        // (diagnostic code removed — was causing ASM 65536 overflow in $2)
        for (MethodNode m : cn.methods) {
            for (AbstractInsnNode insn : m.instructions.toArray()) {
                // String redirect: point mojang.png lookups at our jar's
                // voidcraft_splash.png (which actually exists at
                // assets/minecraft/voidcraft_splash.png inside the coremod
                // jar). The splash thread then draws our Voidcraft image
                // instead of the Mojang silhouette.
                if (insn instanceof LdcInsnNode) {
                    LdcInsnNode ldc = (LdcInsnNode) insn;
                    if (ldc.cst instanceof String) {
                        String s = (String) ldc.cst;
                        if ("textures/gui/title/mojang.png".equals(s) || s.contains("mojang.png")) {
                            ldc.cst = "voidcraft_splash.png";
                            redirected++;
                        }
                    }
                    // Fall through to LDC float-coord patch below.
                }
                // bind()/glBegin() NOPs disabled.
                // Find every glVertex2f call site and log the method name +
                // a small bytecode preview before it.
                // SplashProgress$2.run also draws a 512x512 quad with LDC
                // constants (-16, 64, 496, 576). That's the ACTUAL Mojang
                // silhouette quad (texture-bound to our redirected
                // voidcraft_splash.png). Stretch it to fullscreen by
                // remapping every LDC at vertex-arg position:
                //   -16.0 (left), 64.0 (top)   -> -2000.0
                //   496.0 (right), 576.0 (bottom) -> +2000.0
                // All $2.run quad-stretching attempts disabled — they were
                // either subtly breaking class loading or affecting glOrtho
                // bounds in unexpected ways. Splash will render at native
                // 512x512 centered (Forge's fixed Mojang silhouette size);
                // CLS takes over fullscreen once Forge mods finish loading.
            }
        }
        if (redirected + vReplaced > 0) {
            System.out.println("[VoidcraftCore] SplashProgress " + cn.name + ": "
                + redirected + " mojang.png redirects, "
                + vReplaced + " FLOAD 7/8 -> LDC 2000.0F replacements.");
        }
        ClassWriter cw = new ClassWriter(ClassWriter.COMPUTE_FRAMES | ClassWriter.COMPUTE_MAXS) {
            @Override
            protected String getCommonSuperClass(String t1, String t2) { return "java/lang/Object"; }
        };
        cn.accept(cw);
        return cw.toByteArray();
    }

    private static String opLabel(AbstractInsnNode insn) {
        int op = insn.getOpcode();
        if (insn instanceof org.objectweb.asm.tree.LdcInsnNode) {
            return "LDC(" + ((org.objectweb.asm.tree.LdcInsnNode) insn).cst + ")";
        }
        if (insn instanceof org.objectweb.asm.tree.IntInsnNode) {
            return (op == BIPUSH ? "BIPUSH" : op == SIPUSH ? "SIPUSH" : "INT?")
                + "(" + ((org.objectweb.asm.tree.IntInsnNode) insn).operand + ")";
        }
        switch (op) {
            case ICONST_M1: return "ICONST_M1";
            case ICONST_0: return "ICONST_0";
            case ICONST_1: return "ICONST_1";
            case ICONST_2: return "ICONST_2";
            case ICONST_3: return "ICONST_3";
            case ICONST_4: return "ICONST_4";
            case ICONST_5: return "ICONST_5";
            case FCONST_0: return "FCONST_0";
            case FCONST_1: return "FCONST_1";
            case FCONST_2: return "FCONST_2";
            case I2F:      return "I2F";
            case IADD:     return "IADD";
            case ISUB:     return "ISUB";
            case FADD:     return "FADD";
            case FSUB:     return "FSUB";
        }
        return "OP" + op;
    }

    /**
     * Patches Minecraft.class:
     *  1. Injects {@code GL11.glClearColor(0,0,0,1)} into startGame() so
     *     the first frame is black instead of vanilla white.
     *  2. Stubs out {@code drawSplashScreen(TextureManager)} — this is the
     *     method that actually paints the Mojang silhouette (NOT startGame
     *     directly). Replacing its body with a bare RETURN means no logo
     *     bind, no tessellator draw, no display update — nothing shows.
     */
    private byte[] patchMinecraft(byte[] basicClass) {
        ClassReader cr = new ClassReader(basicClass);
        ClassNode cn = new ClassNode();
        cr.accept(cn, 0);

        boolean patched = false;

        // ---- Step 0: stub drawSplashScreen(TextureManager) ----
        // SRG: func_180510_a, deobf: drawSplashScreen. Returning immediately
        // means the Mojang silhouette + accompanying buffer draw + display
        // update never run.
        for (MethodNode m : cn.methods) {
            boolean isDrawSplash = ("func_180510_a".equals(m.name) || "drawSplashScreen".equals(m.name))
                && "(Lnet/minecraft/client/renderer/texture/TextureManager;)V".equals(m.desc);
            if (!isDrawSplash) continue;
            m.instructions.clear();
            m.tryCatchBlocks.clear();
            if (m.localVariables != null) m.localVariables.clear();
            m.instructions.add(new InsnNode(RETURN));
            m.maxStack = 0;
            m.maxLocals = 2; // this + textureManagerInstance
            patched = true;
            System.out.println("[VoidcraftCore] Minecraft.drawSplashScreen stubbed (Mojang silhouette killed).");
        }

        // ---- Step 1: black clear colour inside startGame() ----
        for (MethodNode m : cn.methods) {
            boolean isStartGame = ("func_71384_a".equals(m.name) || "startGame".equals(m.name))
                && "()V".equals(m.desc);
            if (!isStartGame) continue;

            AbstractInsnNode anchor = null;
            for (AbstractInsnNode insn : m.instructions.toArray()) {
                if (!(insn instanceof MethodInsnNode)) continue;
                MethodInsnNode mi = (MethodInsnNode) insn;
                String o = mi.owner;
                if (o.startsWith("org/lwjgl/opengl/GL")
                    || "net/minecraft/client/renderer/GlStateManager".equals(o)) {
                    anchor = mi;
                    break;
                }
            }

            if (anchor == null) {
                System.out.println("[VoidcraftCore] WARN: no GL call in startGame; clear-color patch skipped.");
                continue;
            }

            InsnList pre = new InsnList();
            pre.add(new InsnNode(FCONST_0)); // r
            pre.add(new InsnNode(FCONST_0)); // g
            pre.add(new InsnNode(FCONST_0)); // b
            pre.add(new InsnNode(FCONST_1)); // a
            pre.add(new MethodInsnNode(
                INVOKESTATIC,
                "org/lwjgl/opengl/GL11",
                "glClearColor",
                "(FFFF)V",
                false
            ));
            m.instructions.insertBefore(anchor, pre);
            patched = true;
            System.out.println("[VoidcraftCore] Minecraft.startGame patched: glClearColor(0,0,0,1) injected before first GL call.");

            // Wipe every TextureManager.bindTexture(ResourceLocation) call in
            // startGame() — together with the GETFIELD that loads `this` ref
            // and the GETSTATIC that loads the texture ResourceLocation, plus
            // the POP if the call result is left on the stack. This kills the
            // native pre-FML Mojang silhouette before it gets a chance to
            // upload its texture. Buffer/clear color stays black.
            int wipedBinds = 0;
            for (AbstractInsnNode insn : m.instructions.toArray()) {
                if (insn.getOpcode() != INVOKEVIRTUAL) continue;
                MethodInsnNode mi = (MethodInsnNode) insn;
                boolean isBind = "net/minecraft/client/renderer/texture/TextureManager".equals(mi.owner)
                    && ("func_110577_a".equals(mi.name) || "bindTexture".equals(mi.name))
                    && "(Lnet/minecraft/util/ResourceLocation;)V".equals(mi.desc);
                if (!isBind) continue;
                // Replace the invocation with POP POP so the (this, location)
                // args left on the stack by the preceding loads get cleaned
                // up safely. NOP would leave them and break stack balance.
                InsnList rep = new InsnList();
                rep.add(new InsnNode(POP));
                rep.add(new InsnNode(POP));
                m.instructions.insert(insn, rep);
                m.instructions.remove(insn);
                wipedBinds++;
            }
            System.out.println("[VoidcraftCore] Minecraft.startGame patched: removed " + wipedBinds + " TextureManager.bindTexture call(s).");

            // The Mojang silhouette is drawn by a single Tessellator.draw()
            // at the end of the splash sequence; even if we blocked the
            // texture bind, the previously-registered "logo" dynamic
            // texture is still the current GL state, so the quad would
            // still show it. Killing draw() outright prevents the quad
            // from ever being emitted.
            int wipedDraws = 0;
            for (AbstractInsnNode insn : m.instructions.toArray()) {
                if (insn.getOpcode() != INVOKEVIRTUAL) continue;
                MethodInsnNode mi = (MethodInsnNode) insn;
                if ("net/minecraft/client/renderer/Tessellator".equals(mi.owner)
                    && ("func_78381_a".equals(mi.name) || "draw".equals(mi.name))
                    && "()V".equals(mi.desc)) {
                    // Pop the `this` Tessellator reference left on the stack.
                    m.instructions.insert(insn, new InsnNode(POP));
                    m.instructions.remove(insn);
                    wipedDraws++;
                }
            }
            System.out.println("[VoidcraftCore] Minecraft.startGame patched: NOPed " + wipedDraws + " Tessellator.draw() call(s).");
        }

        if (!patched) {
            return basicClass;
        }
        // Inside a coremod the launchwrapper classloader can't see MC classes
        // for the default getCommonSuperClass() reflection lookup, so we
        // override it and just return Object — the verifier accepts that as
        // the safe common ancestor for any pair of types.
        ClassWriter cw = new ClassWriter(ClassWriter.COMPUTE_FRAMES | ClassWriter.COMPUTE_MAXS) {
            @Override
            protected String getCommonSuperClass(String type1, String type2) {
                return "java/lang/Object";
            }
        };
        cn.accept(cw);
        return cw.toByteArray();
    }

    /**
     * In TextureManager.bindTexture(ResourceLocation), early-return when the
     * ResourceLocation's path is exactly "textures/gui/title/mojang.png".
     */
    private byte[] patchTextureManager(byte[] basicClass) {
        ClassReader cr = new ClassReader(basicClass);
        ClassNode cn = new ClassNode();
        cr.accept(cn, 0);

        boolean patched = false;
        for (MethodNode m : cn.methods) {
            boolean isBind = ("func_110577_a".equals(m.name) || "bindTexture".equals(m.name))
                && "(Lnet/minecraft/util/ResourceLocation;)V".equals(m.desc);
            if (!isBind) continue;

            // Prelude:
            //   if (resourceLocation != null
            //       && resourceLocation.getPath().contains("mojang")) return;
            InsnList prelude = new InsnList();
            org.objectweb.asm.tree.LabelNode notMojang = new org.objectweb.asm.tree.LabelNode();

            // aload_1 → ResourceLocation
            prelude.add(new VarInsnNode(ALOAD, 1));
            // if null, jump to notMojang
            prelude.add(new org.objectweb.asm.tree.JumpInsnNode(IFNULL, notMojang));
            // aload_1 again
            prelude.add(new VarInsnNode(ALOAD, 1));
            // call getPath()
            prelude.add(new MethodInsnNode(
                INVOKEVIRTUAL,
                "net/minecraft/util/ResourceLocation",
                "func_110623_a",
                "()Ljava/lang/String;",
                false
            ));
            // push "mojang"
            prelude.add(new LdcInsnNode("mojang"));
            // call String.contains
            prelude.add(new MethodInsnNode(
                INVOKEVIRTUAL,
                "java/lang/String",
                "contains",
                "(Ljava/lang/CharSequence;)Z",
                false
            ));
            // if false, jump to notMojang
            prelude.add(new org.objectweb.asm.tree.JumpInsnNode(IFEQ, notMojang));
            // return
            prelude.add(new InsnNode(RETURN));
            // notMojang label
            prelude.add(notMojang);

            m.instructions.insert(prelude);
            patched = true;
            System.out.println("[VoidcraftCore] TextureManager.bindTexture patched (skip mojang.png).");
        }

        if (!patched) {
            System.out.println("[VoidcraftCore] WARN: did not find TextureManager.bindTexture to patch.");
            return basicClass;
        }
        // Inside a coremod the launchwrapper classloader can't see MC classes
        // for the default getCommonSuperClass() reflection lookup, so we
        // override it and just return Object — the verifier accepts that as
        // the safe common ancestor for any pair of types.
        ClassWriter cw = new ClassWriter(ClassWriter.COMPUTE_FRAMES | ClassWriter.COMPUTE_MAXS) {
            @Override
            protected String getCommonSuperClass(String type1, String type2) {
                return "java/lang/Object";
            }
        };
        cn.accept(cw);
        return cw.toByteArray();
    }
}
