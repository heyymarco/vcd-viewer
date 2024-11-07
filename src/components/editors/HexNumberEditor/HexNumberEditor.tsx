// react:
import {
    // react:
    default as React,
    
    
    
    // hooks:
    useMemo,
}                           from 'react'

// reusable-ui core:
import {
    // react helper hooks:
    useEvent,
    useMergeEvents,
}                           from '@reusable-ui/core'                    // a set of reusable-ui packages which are responsible for building any component

// heymarco components:
import {
    // types:
    type EditorChangeEventHandler,
}                           from '@heymarco/editor'
import {
    // react components:
    type InputEditorProps,
    InputEditor,
}                           from '@heymarco/input-editor'
import {
    // react components:
    type NumberEditorProps,
    NumberEditor,
}                           from '@heymarco/number-editor'



// react components:
export interface HexNumberEditorProps<out TElement extends Element = HTMLSpanElement, in TChangeEvent extends React.SyntheticEvent<unknown, Event> = React.ChangeEvent<HTMLInputElement>, TValue extends number|null = number|null>
    extends
        // bases:
        NumberEditorProps<TElement, TChangeEvent, TValue>
{
    // formats:
    radix ?: number
}
const HexNumberEditor = <TElement extends Element = HTMLSpanElement, TChangeEvent extends React.SyntheticEvent<unknown, Event> = React.ChangeEvent<HTMLInputElement>, TValue extends number|null = number|null>(props: HexNumberEditorProps<TElement, TChangeEvent, TValue>): JSX.Element|null => {
    // props:
    const {
        // formats:
        radix = 16,
        
        
        
        // other props:
        ...restHexNumberEditorProps
    } = props;
    
    
    
    // jsx:
    if (radix === 10) return (
        <NumberEditor<TElement, TChangeEvent, TValue>
            // other props:
            {...restHexNumberEditorProps}
        />
    );
    return (
        <HexNumberEditorInternal
            // other props:
            {...props}
        />
    );
}
const HexNumberEditorInternal = <TElement extends Element = HTMLSpanElement, TChangeEvent extends React.SyntheticEvent<unknown, Event> = React.ChangeEvent<HTMLInputElement>, TValue extends number|null = number|null>(props: HexNumberEditorProps<TElement, TChangeEvent, TValue>): JSX.Element|null => {
    // props:
    const {
        // values:
        defaultValue, // take  , to be normalized: number|null => toString(radix)
        value,        // take  , to be normalized: number|null => toString(radix)
        onChange,
        onChangeAsText,
        
        
        
        // formats:
        radix = 16,
        
        
        
        // components:
        inputEditorComponent = (<InputEditor<TElement, TChangeEvent, TValue> /> as React.ReactElement<InputEditorProps<TElement, TChangeEvent, TValue>>),
        
        
        
        // other props:
        ...restHexNumberEditorProps
    } = props;
    if (!isFinite(radix) || ((radix % 1) !== 0) || (radix < 2) || (radix > 36)) throw Error(`Invalid "radix" property. The valid value is an integer in the range 2 through 36. The given value is ${radix}.`);
    
    
    
    // handlers:
    const handleChangeAsTextInternal = useEvent<EditorChangeEventHandler<TChangeEvent, string>>((value, event) => {
        value = value.trim();
        onChange?.((value ? Number.parseInt(value, radix) : null) as TValue, event);
    });
    const handleChangeAsText         = useMergeEvents(
        // preserves the original `onChangeAsText` from `inputEditorComponent`:
        inputEditorComponent.props.onChangeAsText,
        
        
        
        // preserves the original `onChangeAsText` from `props`:
        onChangeAsText,
        
        
        
        // handlers:
        handleChangeAsTextInternal,
    );
    
    
    
    // default props:
    const defaultNumberEditorPattern = useMemo<string>(() =>
        `^\s*[${
            '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, radix)
        }${
            'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, Math.max(0, radix - 10))
        }]\s*$`
    , [radix]);
    const {
        // formats:
        type         : numberEditorType      = 'text',
        inputMode    : numberEditorInputMode = 'text',
        pattern      : numberEditorPattern   = defaultNumberEditorPattern,
        
        
        
        // other props:
        ...restNumberEditorProps
    } = restHexNumberEditorProps;
    
    const {
        // values:
        defaultValue : inputEditorComponentDefaultValue = (typeof(defaultValue) === 'number') ? defaultValue.toString(radix) : defaultValue,
        value        : inputEditorComponentValue        = (typeof(value)        === 'number') ?        value.toString(radix) : value,
        
        
        
        // other props:
        ...restInputEditorComponentProps
    } = inputEditorComponent.props;
    
    
    
    // jsx:
    return (
        <NumberEditor<TElement, TChangeEvent, TValue>
            // other props:
            {...restNumberEditorProps}
            
            
            
            // formats:
            type={numberEditorType}
            inputMode={numberEditorInputMode}
            pattern={numberEditorPattern}
            
            
            
            // components:
            inputEditorComponent={React.cloneElement<InputEditorProps<TElement, TChangeEvent, TValue>>(inputEditorComponent,
                // props:
                {
                    // other props:
                    ...restInputEditorComponentProps,
                    
                    
                    
                    // values:
                    defaultValue   : inputEditorComponentDefaultValue as TValue|undefined,
                    value          : inputEditorComponentValue        as TValue|undefined,
                    
                    
                    
                    // handlers:
                    onChangeAsText : handleChangeAsText,
                },
            )}
        />
    );
};
export {
    HexNumberEditor,            // named export for readibility
    HexNumberEditor as default, // default export to support React.lazy
}
