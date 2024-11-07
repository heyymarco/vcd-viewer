'use client'

// styles:
import styles               from './styles.module.scss'

// react:
import {
    // react:
    default as React,
    
    
    
    // hooks:
    useState,
}                           from 'react'
import cn                   from 'classnames'

// components:
import {
    DropdownListButton,
    ListItem
}                           from '@reusable-ui/components'
import {
    type EditorChangeEventHandler,
}                           from '@heymarco/editor'
import {
    NumberUpDownEditor,
}                           from '@heymarco/number-updown-editor'
import {
    type HexNumberEditorProps,
    HexNumberEditor,
}                           from '@/components/editors/HexNumberEditor'

// utilities:
import {
    useEvent,
}                           from '@reusable-ui/core'
import {
    useControllableAndUncontrollable,
}                           from '@heymarco/events'
import {
    radixOptions,
}                           from './utilities'



// react components:
export interface RadixNumberEditorProps<out TElement extends Element = HTMLSpanElement, in TChangeEvent extends React.SyntheticEvent<unknown, Event> = React.ChangeEvent<HTMLInputElement>, TValue extends number = number>
    extends
        // bases:
        HexNumberEditorProps<TElement, TChangeEvent, TValue>
{
}
const RadixNumberEditor = <TElement extends Element = HTMLSpanElement, TChangeEvent extends React.SyntheticEvent<unknown, Event> = React.ChangeEvent<HTMLInputElement>, TValue extends number = number>(props: RadixNumberEditorProps<TElement, TChangeEvent, TValue>): JSX.Element|null => {
    // states:
    const [radix , setRadix] = useState<number>(props.radix ?? 10);
    
    
    
    // jsx:
    return (
        <NumberUpDownEditor<TElement, TChangeEvent, TValue>
            {...props}
            
            
            
            // classes:
            className={cn(styles.main, props.className)}
            
            
            
            // validations:
            required={true}
            min={0}
            max={(radixOptions.find(({radix: radixSearch}) => (radixSearch === radix))?.radix ?? 10) - 1}
            step={1}
            
            
            
            // components:
            numberEditorComponent={
                <HexNumberEditor
                    // formats:
                    radix={radix}
                />
            }
            
            
            
            // children:
            childrenAfterButton={<>
                <DropdownListButton
                    theme={props.theme}
                    floatingPlacement='bottom-end'
                    buttonChildren={radixOptions.find(({radix: radixSearch}) => (radixSearch === radix))?.name ?? 'decimal'}
                    className={cn(styles.dropdownButton, 'solid')}
                >
                    {radixOptions.map(({name, radix: radixOption}, index) =>
                        <ListItem
                            key={index}
                            active={radixOption === radix}
                            onClick={(event) => setRadix(radixOption)}
                        >
                            {name}
                        </ListItem>
                    )}
                </DropdownListButton>
            </>}
        />
    );
};
export {
    RadixNumberEditor,
    RadixNumberEditor as default,
}