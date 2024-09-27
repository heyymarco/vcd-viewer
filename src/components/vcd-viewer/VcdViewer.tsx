'use client'

import styles from './styles.module.scss'

// react:
import {
    // react:
    default as React,
    
    
    
    // hooks:
    useRef,
    useState,
    useEffect,
    useLayoutEffect,
    useCallback,
}                           from 'react'
import cn                   from 'classnames'
import * as d3              from 'd3'

// models:
import {
    type Vcd,
}                           from '@/models/vcd'

// utilities:
import {
    flatMapVariables,
    getVariableMaxTick,
    actionKeys,
}                           from './utilities'



// react components:
export interface VcdViewerProps
    extends
        // bases:
        Omit<React.HTMLAttributes<HTMLDivElement>,
            |'children' // no nested children
        >
{
    // data:
    vcd ?: Vcd|null
}
const VcdViewer = (props: VcdViewerProps): JSX.Element|null => {
    // props:
    const {
        // data:
        vcd = null,
        
        
        
        // other props:
        ...restVcdViewerProps
    } = props;
    const maxTick = !vcd ? 0 : getVariableMaxTick(vcd.rootModule);
    
    
    
    // states:
    const [zoom, setZoom] = useState<number>(1);
    const baseScale = 2 ** zoom;
    
    const [mainSelection, setMainSelection] = useState<number|null>(null);
    const [altSelection , setAltSelection ] = useState<number|null>(null);
    
    const [inputLogs] = useState(() => ({
        isMouseActive       : false,
        isTouchActive       : false,
        isKeyActive         : false,
        
        activeKeys          : new Set<string>(),
        // performKeyUpActions : false,
        
        get isActive(): boolean {
            return (
                (
                    (+this.isMouseActive)
                    +
                    (+this.isTouchActive)
                    +
                    (+this.isKeyActive)
                )
                ===
                1 // must *exactly one* of actived input, if none -or- two -or- more => deactivated
            );
        },
        
        logMouseEvent : function(event: MouseEvent, isMouseDown: boolean, actionMouses: number[]|null) {
            this.isMouseActive = (
                isMouseDown // the *last* action is pressing mouse, not releasing
                &&
                !!event.buttons // one/more buttons are pressed
                &&
                (
                    !actionMouses // null => no constraint
                    ||
                    actionMouses.includes(event.buttons) // within constraint
                )
            );
        },
        logTouchEvent : function(event: TouchEvent, isTouchDown: boolean, actionTouches: number[]|null) {
            this.isTouchActive = (
                isTouchDown // the *last* action is touching, not releasing
                &&
                !!event.touches.length // one/more fingers are touched
                &&
                (
                    !actionTouches // null => no constraint
                    ||
                    actionTouches.includes(event.touches.length) // within constraint
                )
            );
        },
        logKeyEvent : function(event: KeyboardEvent, isKeyDown: boolean, actionKeys: string[]|null) {
            // conditions:
            /* note: the `code` may `undefined` on autoComplete */
            const keyCode = (event.code as string|undefined)?.toLowerCase();
            if (!keyCode) return; // ignores [unidentified] key
            
            
            
            if (isKeyDown) {
                this.activeKeys.add(keyCode);
            }
            else {
                this.activeKeys.delete(keyCode);
            } // if
            
            
            
            this.isKeyActive = (
                isKeyDown // the *last* action is pressing key, not releasing
                &&
                (this.activeKeys.size === 1) // only one key is pressed
                &&
                (
                    !actionKeys // null => no constraint
                    ||
                    actionKeys.includes(keyCode) // within constraint
                )
            );
            // console.log({activeKeys: this.activeKeys});
        },
    }));
    
    
    
    // refs:
    const svgRef   = useRef<SVGSVGElement|null>(null);
    const rulerRef = useRef<SVGGElement|null>(null);
    
    
    
    // handlers:
    const handleZoomOut = useCallback(() => {
        setZoom((current) => (current - 1));
    }, []);
    const handleZoomIn  = useCallback(() => {
        setZoom((current) => (current + 1));
    }, []);
    const handleKeyDown = useCallback<React.KeyboardEventHandler<Element>>((event) => {
        // conditions:
        /* note: the `code` may `undefined` on autoComplete */
        const keyCode = (event.code as string|undefined)?.toLowerCase();
        if (!keyCode) return; // ignores [unidentified] key
        
        
        
        // logs:
        inputLogs.logKeyEvent(event.nativeEvent, true /*key_down*/, actionKeys);
        if (watchGlobalKey(true) === true) {
            event.preventDefault();
            console.log({activeKeys: inputLogs.activeKeys});
            // TODO: update keydown activated
        } // if
        
        
        
        // // actions:
        // if (inputLogs.isActive) {
        //     // trigger the onClick event later at `onKeyUp`
        //     inputLogs.performKeyUpActions = true;
        // }
    }, []);
    const handleClick   = useCallback<React.MouseEventHandler<Element>>((event) => {
        const { x } = event.currentTarget.getBoundingClientRect();
        const relativePosition = event.clientX - x;
        const valuePosition    = relativePosition / baseScale;
        if (inputLogs.activeKeys.has('altleft') || inputLogs.activeKeys.has('altright')) {
            setAltSelection(valuePosition);
        }
        else {
            setMainSelection(valuePosition);
        } // if
    }, []);
    
    
    
    // global handlers:
    const watchGlobalKeyStatusRef = useRef<undefined|(() => void)>(undefined);
    const watchGlobalKey = useCallback((active: boolean): boolean|null => {
        // conditions:
        const shouldActive = active /* && enabled */;
        if (!!watchGlobalKeyStatusRef.current === shouldActive) return null; // already activated|deactivated => nothing to do
        
        
        
        // handlers:
        const handleKeyUp = (event: KeyboardEvent): void => {
            // conditions:
            /* note: the `code` may `undefined` on autoComplete */
            const keyCode = (event.code as string|undefined)?.toLowerCase();
            if (!keyCode) return; // ignores [unidentified] key
            
            
            
            // logs:
            inputLogs.logKeyEvent(event, false /*key_up*/, actionKeys);
            if (watchGlobalKey(false) === false) {
                console.log({activeKeys: inputLogs.activeKeys});
                // TODO: update keydown deactivated
            } // if
        };
        
        
        
        // actions:
        if (shouldActive) {
            window.addEventListener('keyup', handleKeyUp);
            
            
            
            // cleanups later:
            watchGlobalKeyStatusRef.current = () => {
                window.removeEventListener('keyup', handleKeyUp);
            };
        }
        else {
            // cleanups:
            watchGlobalKeyStatusRef.current?.();
            watchGlobalKeyStatusRef.current = undefined;
        } // if
        
        
        
        return shouldActive;
    }, []);
    
    
    
    // effects:
    useEffect(() => {
        // conditions:
        const svgElm   = svgRef.current;
        const rulerElm = rulerRef.current;
        if (!svgElm || !rulerElm) return;
        
        
        
        // setups:
        
        const resizeObserver = new ResizeObserver(({ '0': { borderBoxSize: { '0': { inlineSize } } }}) => {
            const extendSize = inlineSize / (maxTick * baseScale);
            // console.log({inlineSize, extendSize})
            const ruler = d3.scaleLinear([0, maxTick * extendSize], [0, maxTick * baseScale * extendSize]);
            d3.select(rulerRef.current).call(
                d3.axisTop(ruler) as any
            );
        });
        resizeObserver.observe(svgElm, { box: 'border-box' });
        
        
        
        // cleanups:
        return () => {
            resizeObserver.disconnect();
        }
    }, [maxTick, baseScale]);
    
    
    
    // default props:
    const {
        // accessibilities:
        tabIndex = 0, // focusable
        
        
        
        // other props:
        ...restDivProps
    } = restVcdViewerProps;
    
    
    
    // jsx:
    return (
        <div
            // other props:
            {...restDivProps}
            
            
            
            // accessibilities:
            tabIndex={tabIndex}
            
            
            
            // classes:
            className={cn(props.className, styles.main)}
            
            
            
            // handlers:
            onKeyDown={handleKeyDown}
        >
            <div className={styles.toolbar}>
                <button onClick={handleZoomOut}>-</button>
                <button onClick={handleZoomIn}>+</button>
            </div>
            <div
                // classes:
                className={cn(props.className, styles.body)}
                
                
                
                // handlers:
                onClick={handleClick}
            >
                {/* ruler: */}
                <svg ref={svgRef} className={styles.ruler}>
                    <g ref={rulerRef} transform='translate(0, 20)' />
                </svg>
                
                {/* body */}
                {!!vcd && flatMapVariables(vcd.rootModule).map(({ waves, lsb, msb, size, name }, index) =>
                    <div key={index} className={styles.variable}>
                        <div className={styles.waves}>
                            {waves.map(({tick, value}, index, waves) => {
                                const nextTick : number = (waves.length && ((index + 1) < waves.length)) ? waves[index + 1].tick : maxTick;
                                // if (nextTick === maxTick) return null;
                                const isError  = (typeof(value) === 'string') /* || ((lsb !== undefined) && (value < lsb)) || ((msb !== undefined) && (value > msb)) */;
                                const isBinary = (size === 1);
                                
                                
                                
                                // jsx:
                                const length = (nextTick - tick) * baseScale;
                                if (length === 0) return;
                                return (
                                    <span key={index} style={{ '--length': length } as any} className={cn(isError ? 'error' : undefined, isBinary ? `bin ${value ? 'hi':'lo'}` : undefined)}>
                                        {!isBinary && ((typeof(value) === 'string') ? value : value.toString(16))}
                                    </span>
                                );
                            })}
                        </div>
                        {(() => {
                            const lastWave = waves.length ? waves[waves.length - 1] : undefined;
                            if (lastWave === undefined) return null; // if the last wave doesn't exist => do not render
                            const {
                                value,
                            } = lastWave;
                            
                            const isError  = (typeof(value) === 'string') /* || ((lsb !== undefined) && (value < lsb)) || ((msb !== undefined) && (value > msb)) */;
                            const isBinary = (size === 1);
                            
                            
                            
                            // jsx:
                            return (
                                <span key={index} className={cn('last', styles.lastWave, isError ? 'error' : undefined, isBinary ? `bin ${value ? 'hi':'lo'}` : undefined)}>
                                    {!isBinary && ((typeof(value) === 'string') ? value : value.toString(16))}
                                </span>
                            );
                        })()}
                    </div>
                )}
                
                {/* selection */}
                {(mainSelection !== null) && <div className={cn(styles.selection, 'main')} style={{'--position': mainSelection * baseScale} as any} />}
                {(altSelection  !== null) && <div className={cn(styles.selection, 'alt' )} style={{'--position': altSelection  * baseScale} as any} />}
            </div>
        </div>
    );
};
export {
    VcdViewer,            // named export for readibility
    VcdViewer as default, // default export to support React.lazy
}
