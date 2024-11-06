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
export interface TimescaleEditorProps<out TElement extends Element = HTMLSpanElement>
    extends
        // bases:
        NumberUpDownEditorProps<TElement, React.SyntheticEvent<unknown, Event>>
{
}
const TimescaleEditor = <TElement extends Element = HTMLSpanElement>(props: TimescaleEditorProps<TElement>): JSX.Element|null => {
    // props:
    const {
        // values:
        defaultValue : defaultUncontrollableTimescale = 1,
        value        : controllableTimescale,
        onChange     : onControllableTimescaleChange,
    } = props;
    
    
    
    // states:
    const [initialTimescale] = useState<{ name: string, magnitudo: number, value: number|null }>(() => {
        const value = props.value;
        if ((value === null) || (value === undefined)) return { name: 'milliseconds', magnitudo: 3, value: value ?? null };
        for (const { magnitudo, name } of timescaleOptions.toReversed()) {
            if (value < ((0.1 ** magnitudo) * 999.999)) return { name, magnitudo, value };
        } // for
        return { name: 'milliseconds', magnitudo: 3, value: value ?? null };
    });
    const [timescaleName , setTimescaleName ] = useState<string>(() => initialTimescale.name);
    const [timescaleValue, setTimescaleValue] = useState<number|null>(() => !initialTimescale.value /* 0 or null */ ? null : (initialTimescale.value * (10 ** initialTimescale.magnitudo)));
    
    
    
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
    const handleValueChange = useEvent<EditorChangeEventHandler<React.ChangeEvent<HTMLInputElement>, number|null>>((newValue, event) => {
        setTimescaleValue(newValue);
        handleChange(newValue, timescaleName, event);
    });
    const handleNameChange = useEvent((newTimescaleName: string, event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        setTimescaleName(newTimescaleName);
        handleChange(timescaleValue, newTimescaleName, event);
    });
    const handleChange = useEvent((timescaleValue: number|null, timescaleName: string, event: React.SyntheticEvent<unknown, Event>) => {
        if (!timescaleValue /* 0 or null */) {
            triggerTimescaleChange(timescaleValue, { event, triggerAt: 'immediately' });
            return;
        } // if
        
        
        
        const magnitudo = timescaleOptions.find(({name}) => (name === timescaleName))?.magnitudo ?? 3;
        const newTimescale = timescaleValue * (0.1 ** magnitudo);
        triggerTimescaleChange(newTimescale, { event, triggerAt: 'immediately' });
    });
    
    
    
    // jsx:
    return (
        <NumberUpDownEditor
            {...props}
            
            
            
            // classes:
            className={cn(styles.main, props.className)}
            
            
            
            // values:
            value={timescaleValue}
            onChange={handleValueChange}
            
            
            
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
                            onClick={(event) => handleNameChange(name, event)}
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