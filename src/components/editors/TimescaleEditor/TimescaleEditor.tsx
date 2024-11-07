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
    type NumberUpDownEditorProps,
    NumberUpDownEditor,
}                           from '@heymarco/number-updown-editor'

// utilities:
import {
    useEvent,
}                           from '@reusable-ui/core'
import {
    useControllableAndUncontrollable,
}                           from '@heymarco/events'
import {
    timescaleOptions,
}                           from './utilities'



// react components:
export interface TimescaleEditorProps<out TElement extends Element = HTMLSpanElement, in TChangeEvent extends React.SyntheticEvent<unknown, Event> = React.ChangeEvent<HTMLInputElement>, TValue extends number = number>
    extends
        // bases:
        NumberUpDownEditorProps<TElement, TChangeEvent, TValue>
{
}
const TimescaleEditor = <TElement extends Element = HTMLSpanElement, TChangeEvent extends React.SyntheticEvent<unknown, Event> = React.ChangeEvent<HTMLInputElement>, TValue extends number = number>(props: TimescaleEditorProps<TElement, TChangeEvent, TValue>): JSX.Element|null => {
    // props:
    const {
        // values:
        defaultValue : defaultUncontrollableTimescale = (1 as TValue),
        value        : controllableTimescale,
        onChange     : onControllableTimescaleChange,
    } = props;
    
    
    
    // states:
    const [initialTimescale] = useState<{ name: string, magnitudo: number, value: number }>(() => {
        const value = props.value;
        if ((value === undefined)) return { name: 'milliseconds', magnitudo: 3, value: value ?? 1 };
        for (const { magnitudo, name } of timescaleOptions.toReversed()) {
            if (value < ((0.1 ** magnitudo) * 999)) return { name, magnitudo, value };
        } // for
        return { name: 'milliseconds', magnitudo: 3, value };
    });
    const [timescaleName , setTimescaleName ] = useState<string>(() => initialTimescale.name);
    const [timescaleValue, setTimescaleValue] = useState<TValue>(() => (initialTimescale.value * (10 ** initialTimescale.magnitudo)) as TValue);
    
    
    
    // states:
    const {
        value              : timescale,
        triggerValueChange : triggerTimescaleChange,
    } = useControllableAndUncontrollable({
        defaultValue       : defaultUncontrollableTimescale,
        value              : controllableTimescale,
        onValueChange      : onControllableTimescaleChange,
    });
    
    
    
    // handlers:
    const handleValueChange = useEvent<EditorChangeEventHandler<TChangeEvent, TValue>>((newValue, event) => {
        setTimescaleValue(newValue);
        handleChange(newValue, timescaleName, event);
    });
    const handleNameChange = useEvent((newTimescaleName: string, event: TChangeEvent) => {
        setTimescaleName(newTimescaleName);
        handleChange(timescaleValue, newTimescaleName, event);
    });
    const handleChange = useEvent((timescaleValue: TValue, timescaleName: string, event: TChangeEvent) => {
        if (!timescaleValue /* 0 or null */) {
            triggerTimescaleChange(timescaleValue as TValue, { event, triggerAt: 'immediately' });
            return;
        } // if
        
        
        
        const magnitudo = timescaleOptions.find(({name}) => (name === timescaleName))?.magnitudo ?? 3;
        const newTimescale = timescaleValue * (0.1 ** magnitudo);
        triggerTimescaleChange(newTimescale as TValue, { event, triggerAt: 'immediately' });
    });
    
    
    
    // jsx:
    return (
        <NumberUpDownEditor<TElement, TChangeEvent, TValue>
            {...props}
            
            
            
            // classes:
            className={cn(styles.main, props.className)}
            
            
            
            // values:
            value={timescaleValue}
            onChange={handleValueChange}
            
            
            
            // validations:
            required={true}
            min={1}
            max={999}
            step={1}
            
            
            
            // children:
            childrenAfterButton={<>
                <DropdownListButton
                    theme={props.theme}
                    floatingPlacement='bottom-end'
                    buttonChildren={timescaleName}
                    className={cn(styles.dropdownButton, 'solid')}
                >
                    {timescaleOptions.map(({name}, index) =>
                        <ListItem
                            key={index}
                            active={name === timescaleName}
                            onClick={(event) => handleNameChange(name, event as unknown as TChangeEvent)}
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
    TimescaleEditor,
    TimescaleEditor as default,
}