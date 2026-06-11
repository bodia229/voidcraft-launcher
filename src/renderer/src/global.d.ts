import type * as React from 'react'

// React 19 dropped the global JSX namespace; restore it for component return-type
// annotations like `JSX.Element` without per-file import noise.
declare global {
  namespace JSX {
    type Element = React.JSX.Element
    type ElementClass = React.JSX.ElementClass
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>
    type IntrinsicAttributes = React.JSX.IntrinsicAttributes
    type IntrinsicClassAttributes<T> = React.JSX.IntrinsicClassAttributes<T>
    type IntrinsicElements = React.JSX.IntrinsicElements
  }
}

export {}
