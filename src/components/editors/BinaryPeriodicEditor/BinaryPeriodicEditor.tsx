
// styles:
import styles               from './styles.module.scss'

// react:
import {
    // react:
    default as React,
    useState,
}                           from 'react'

// reusable-ui core:
import {
    // react helper hooks:
    useEvent,
    EventHandler,
    
    
    
    // an accessibility management system:
    AccessibilityProvider,
    
    
    
    // a capability of UI to be highlighted/selected/activated:
    ActiveChangeEvent,
}                           from '@reusable-ui/core'            // a set of reusable-ui packages which are responsible for building any component

// heymarco:
import type {
    // types:
    EditorChangeEventHandler,
    
    
    
    // react components:
    EditorProps,
}                           from '@heymarco/editor'
import {
    // utilities:
    useControllableAndUncontrollable,
}                           from '@heymarco/events'
import {
    DataTableHeader,
    DataTableBody,
    DataTableItem,
    DataTable,
}                           from '@heymarco/data-table'
import {
    RadioDecorator,
}                           from '@heymarco/radio-decorator'
import {
    NumberUpDownEditor,
}                           from '@heymarco/number-updown-editor'

// reusable-ui components:
import {
    // base-components:
    IndicatorProps,
    
    
    
    // simple-components:
    Form,
    Check,
    Group,
    Label,
    Radio,
    FormProps,
    List,
    ListItem,
    Generic,
}                           from '@reusable-ui/components'  // a set of official Reusable-UI components

// internals components:
import {
    TimescaleEditor,
}                           from '@/components/editors/TimescaleEditor'

// models:
import {
    vcdTimescaleToString,
}                           from '@/models'



// utilities:
const emptyBinaryPeriodicValue : Required<BinaryPeriodicValue> = {
    timescale     : 1,
    
    startingValue : false,
    flipInterval  : 1,
    
    minTime       : 0,
    currentTime   : 0,
    maxTime       : 0,
    beginTime     : 0,
    endTime       : 0,
};
Object.freeze(emptyBinaryPeriodicValue);



// react components:
export type BinaryPeriodicValue = {
    timescale     : number
    
    startingValue : boolean
    flipInterval  : number
    
    minTime       : number
    currentTime   : number
    maxTime       : number
    beginTime     : number
    endTime       : number
}
export interface BinaryPeriodicEditorProps<out TElement extends Element = HTMLSpanElement, in TChangeEvent extends React.SyntheticEvent<unknown, Event> = React.ChangeEvent<HTMLInputElement>, TValue extends BinaryPeriodicValue = BinaryPeriodicValue>
    extends
        // bases:
        Pick<EditorProps<TElement, TChangeEvent, TValue>,
            // values:
            |'defaultValue' // supported
            |'value'        // supported
            |'onChange'     // supported
        >,
        Omit<IndicatorProps<HTMLFormElement>,
            // refs:
            |'elmRef'       // overriden
            
            
            
            // values:
            |'defaultValue' // taken over by EditorProps
            |'value'        // taken over by EditorProps
            |'onChange'     // taken over by EditorProps
            
            
            
            // children:
            |'children'     // not supported
        >
{
    // refs:
    elmRef                  ?: FormProps['elmRef']
    
    
    
    // accessibilities:
    cancelationReasonLabel  ?: string
}
const BinaryPeriodicEditor = <TElement extends Element = HTMLSpanElement, TChangeEvent extends React.SyntheticEvent<unknown, Event> = React.ChangeEvent<HTMLInputElement>, TValue extends BinaryPeriodicValue = BinaryPeriodicValue>(props: BinaryPeriodicEditorProps<TElement, TChangeEvent, TValue>): JSX.Element|null => {
    // rest props:
    const {
        // refs:
        elmRef,
        
        
        
        // accessibilities:
        cancelationReasonLabel  = 'Cancelation Reason (if any)',
        
        
        
        // values:
        defaultValue : defaultUncontrollableValue = emptyBinaryPeriodicValue as TValue,
        value        : controllableValue,
        onChange     : onControllableValueChange,
    ...restIndicatorProps} = props;
    
    const {
        // accessibilities:
        enabled,         // take
        inheritEnabled,  // take
        
        active,          // take
        inheritActive,   // take
        
        readOnly,        // take
        inheritReadOnly, // take
    ...restFormProps} = restIndicatorProps;
    
    
    
    // states:
    const {
        value              : value,
        triggerValueChange : triggerValueChange,
    } = useControllableAndUncontrollable<TValue, TChangeEvent>({
        defaultValue       : defaultUncontrollableValue,
        value              : controllableValue,
        onValueChange      : onControllableValueChange,
    });
    
    const {
        timescale,
        
        startingValue,
        flipInterval,
        
        minTime,
        currentTime,
        maxTime,
        beginTime,
        endTime,
    } = value;
    console.log({
        defaultUncontrollableValue,
        controllableValue,
        onControllableValueChange,
        value,
    });
    
    const enum IntervalMode {
        Fill = 0,
        CursorToEnd = 1,
        CursorToNPeriods = 2,
    }
    const [intervalMode , setIntervalModeRaw ] = useState<IntervalMode>(IntervalMode.CursorToEnd);
    const [intervalTimes, setIntervalTimesRaw] = useState<number>(1);
    
    
    
    // utilities:
    const setValue = useEvent((newValue: Partial<TValue>, event: TChangeEvent) => {
        const combinedNewValue : TValue = {
            ...value,
            ...newValue,
        };
        
        
        
        // update:
        triggerValueChange(combinedNewValue, { event, triggerAt: 'immediately' });
    });
    
    
    
    // handlers:
    const handleStartingValueChange = useEvent<EventHandler<ActiveChangeEvent>>(({active: newStartingValue}) => {
        setValue({
            startingValue : newStartingValue,
        } as TValue, undefined as unknown as TChangeEvent);
    });
    const handleFlipIntervalChange  = useEvent<EditorChangeEventHandler<React.ChangeEvent<HTMLInputElement>, number>>((value) => {
        setValue({
            flipInterval : value,
        } as TValue, undefined as unknown as TChangeEvent);
    });
    const setIntervalMode  = useEvent((intervalMode: IntervalMode) => {
        setIntervalModeRaw(intervalMode);
        
        
        
        switch (intervalMode) {
            case IntervalMode.Fill:
                setValue({
                    beginTime    : minTime,
                    endTime      : maxTime,
                } as TValue, undefined as unknown as TChangeEvent);
                break;
            case IntervalMode.CursorToEnd:
                setValue({
                    beginTime    : currentTime,
                    endTime      : maxTime,
                } as TValue, undefined as unknown as TChangeEvent);
                break;
            case IntervalMode.CursorToNPeriods:
                setValue({
                    beginTime    : currentTime,
                    endTime      : currentTime + (intervalTimes * flipInterval),
                } as TValue, undefined as unknown as TChangeEvent);
                break;
        } // switch
    });
    const setIntervalTimes = useEvent((intervalTimes: number) => {
        setIntervalTimesRaw(intervalTimes);
        
        
        
        if (intervalMode === IntervalMode.CursorToNPeriods) {
            setValue({
                beginTime    : currentTime,
                endTime      : currentTime + (intervalTimes * flipInterval),
            } as TValue, undefined as unknown as TChangeEvent);
        } // if
    });
    
    const handleCursorToNPeriodsMouseDown = useEvent<React.MouseEventHandler<HTMLElement>>((event) => {
        if (intervalMode === IntervalMode.CursorToNPeriods) event.stopPropagation();
    });
    
    
    
    // jsx:
    return (
        <Form
            // other props:
            {...restFormProps}
            
            
            
            // refs:
            elmRef={elmRef}
            
            
            
            // variants:
            nude={props.nude ?? true}
            
            
            
            // classes:
            mainClass={props.mainClass ?? styles.main}
        >
            <AccessibilityProvider
                // accessibilities:
                enabled         = {enabled        }
                inheritEnabled  = {inheritEnabled }
                
                active          = {active         }
                inheritActive   = {inheritActive  }
                
                readOnly        = {readOnly       }
                inheritReadOnly = {inheritReadOnly}
            >
                <DataTable size={props.size} expanded={true}>
                    <DataTableBody>
                        <DataTableItem label='Starting value' tableDataComponent={<Generic className={styles.startingValue} />}>
                            <List size={props.size} orientation='inline' actionCtrl={true}>
                                <ListItem className={styles.selection} active={!startingValue} onClick={() => handleStartingValueChange({ active: false })}>
                                    <RadioDecorator size={props.size} />
                                    <span>
                                        LOW
                                    </span>
                                </ListItem>
                                <ListItem className={styles.selection} active={startingValue} onClick={() => handleStartingValueChange({ active: true })}>
                                    <RadioDecorator size={props.size} />
                                    <span>
                                        HIGH
                                    </span>
                                </ListItem>
                            </List>
                        </DataTableItem>
                        <DataTableItem label='Flips every' tableDataComponent={<Generic className={styles.flips} />}>
                            <Group>
                                <NumberUpDownEditor size={props.size} theme='primary' min={1} max={999} value={flipInterval} onChange={handleFlipIntervalChange} />
                                <Label className='solid'>
                                    × {vcdTimescaleToString(timescale)}
                                </Label>
                            </Group>
                        </DataTableItem>
                        <DataTableItem label='Duration' tableDataComponent={<Generic className={styles.duration} />}>
                            <List size={props.size} orientation='block' actionCtrl={true}>
                                <ListItem className={styles.selection} active={intervalMode === IntervalMode.Fill} onClick={() => setIntervalMode(IntervalMode.Fill)}>
                                    <RadioDecorator size={props.size} />
                                    <div>
                                        From beginning to end
                                    </div>
                                </ListItem>
                                <ListItem className={styles.selection} active={intervalMode === IntervalMode.CursorToEnd} onClick={() => setIntervalMode(IntervalMode.CursorToEnd)}>
                                    <RadioDecorator size={props.size} />
                                    <div>
                                        From current cursor to end
                                    </div>
                                </ListItem>
                                <ListItem className={styles.selection} active={intervalMode === IntervalMode.CursorToNPeriods} onClick={() => setIntervalMode(IntervalMode.CursorToNPeriods)}>
                                    <RadioDecorator size={props.size} />
                                    <div className={styles.cursorToNPeriods}>
                                        <span>
                                            From current cursor to flips N times
                                        </span>
                                        <Group size={props.size} onMouseDown={handleCursorToNPeriodsMouseDown}>
                                            <Label className='solid'>
                                                flips
                                            </Label>
                                            <NumberUpDownEditor min={0} max={999} value={intervalTimes} onChange={setIntervalTimes} />
                                            <Label className='solid'>
                                                times
                                            </Label>
                                        </Group>
                                    </div>
                                </ListItem>
                            </List>
                        </DataTableItem>
                    </DataTableBody>
                </DataTable>
            </AccessibilityProvider>
        </Form>
    );
};
export {
    BinaryPeriodicEditor,
    BinaryPeriodicEditor as default,
}
