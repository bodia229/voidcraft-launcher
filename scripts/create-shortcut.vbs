Option Explicit
Dim objShell, objFS, objShortcut, strDesktop, strTarget, strIcon, strLnkPath, strOldLnk
Set objShell = CreateObject("WScript.Shell")
Set objFS = CreateObject("Scripting.FileSystemObject")
strDesktop = objShell.SpecialFolders("Desktop")
strTarget = "C:\Users\user\technomagia-launcher\release\Voidcraft 0.1.0.exe"
strIcon = "C:\Users\user\technomagia-launcher\resources\voidcraft.ico"
strLnkPath = strDesktop & "\Voidcraft.lnk"

' Remove the old shortcut (forces Windows to re-read the icon when it's recreated)
If objFS.FileExists(strLnkPath) Then objFS.DeleteFile strLnkPath, True
strOldLnk = strDesktop & "\TechnoMagia Launcher.lnk"
If objFS.FileExists(strOldLnk) Then objFS.DeleteFile strOldLnk, True

Set objShortcut = objShell.CreateShortcut(strLnkPath)
objShortcut.TargetPath = strTarget
objShortcut.WorkingDirectory = "C:\Users\user\technomagia-launcher\release"
objShortcut.IconLocation = strIcon & ",0"
objShortcut.Description = "Voidcraft Minecraft 1.12.2 Modpack Launcher"
objShortcut.WindowStyle = 1
objShortcut.Save

' Notify shell so the icon refreshes without an explorer restart
objShell.Run "ie4uinit.exe -show", 0, False

WScript.Echo "Shortcut recreated with fresh icon path: " & strLnkPath
