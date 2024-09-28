'use client'

import styles from './styles.module.scss'

// react:
import {
    // react:
    default as React,
    
    
    
    // hooks:
    useRef,
    useState,
}                           from 'react'
import cn                   from 'classnames'
import * as d3              from 'd3'
import {
    useIsomorphicLayoutEffect,
    useEvent,
}                           from '@reusable-ui/core'

// models:
import {
    type Vcd,
    type VcdWave,
}                           from '@/models/vcd'

// utilities:
import {
    flatMapVariables,
    getVariableMinTick,
    getVariableMaxTick,
    
    actionKeys,
    actionMouses,
    actionTouches,
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
    const minTick = !vcd ? 0 : getVariableMinTick(vcd.rootModule);
    const maxTick = !vcd ? 0 : getVariableMaxTick(vcd.rootModule);
    const allVcdVariables = !vcd ? [] : flatMapVariables(vcd.rootModule);
    
    
    
    // states:
    const [zoom, setZoom] = useState<number>(1);
    const baseScale = 2 ** zoom;
    
    const [mainSelection    , setMainSelection    ] = useState<number|null>(null);
    const [altSelection     , setAltSelection     ] = useState<number|null>(null);
    
    const [focusedVariable  , setFocusedVariable  ] = useState<number|null>(null);
    const isBinarySelection = (focusedVariable !== null) && (allVcdVariables?.[focusedVariable]?.size === 1);
    
    const [selectionStart   , setSelectionStart   ] = useState<number|null>(null);
    const [selectionEnd     , setSelectionEnd     ] = useState<number|null>(null);
    
    const [enableTouchScroll, setEnableTouchScroll] = useState<boolean>(false);
    const touchStartRef = useRef<number>(0);
    
    const [search           , setSearch           ] = useState<string>('');
    
    enum SearchType {
        TIME,
        HEX,
    }
    const [searchType       , setSearchType       ] = useState<SearchType>(SearchType.HEX);
    
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
    const svgRef       = useRef<SVGSVGElement|null>(null);
    const bodyRef      = useRef<HTMLDivElement|null>(null);
    const rulerRef     = useRef<SVGGElement|null>(null);
    const variablesRef = useRef<HTMLDivElement|null>(null);
    
    
    
    // utilities:
    const isAltPressed = useEvent((): boolean => {
        return inputLogs.activeKeys.has('altleft') || inputLogs.activeKeys.has('altright')
    });
    
    
    
    // handlers:
    const handleKeyDown           = useEvent<React.KeyboardEventHandler<Element>>((event) => {
        // conditions:
        if ((event.target as Element)?.tagName === 'INPUT') return; // do not intercept <input>
        
        
        
        // actions:
        event.preventDefault();
        
        
        
        // conditions:
        /* note: the `code` may `undefined` on autoComplete */
        const keyCode = (event.code as string|undefined)?.toLowerCase();
        if (!keyCode) return; // ignores [unidentified] key
        
        
        
        // logs:
        inputLogs.logKeyEvent(event.nativeEvent, true /*key_down*/, actionKeys);
        if (watchGlobalKey(true) === true) {
            // console.log({activeKeys: inputLogs.activeKeys});
            // TODO: update keydown activated
        } // if
        
        
        
        // // actions:
        // if (inputLogs.isActive) {
        //     // trigger the onClick event later at `onKeyUp`
        //     inputLogs.performKeyUpActions = true;
        // }
    });
    
    const handleMouseDown         = useEvent<React.MouseEventHandler<Element>>((event) => {
        // actions:
        // event.preventDefault(); // do not preventing, causing the click_to_focus doesn't work
        
        
        
        // logs:
        inputLogs.logMouseEvent(event.nativeEvent, true /*mouse_down*/, actionMouses);
        if (watchGlobalMouse(true) === true) {
            // console.log({activeKeys: inputLogs.activeKeys});
            handlePointerDown(event.nativeEvent);
        } // if
    });
    const handleTouchStart        = useEvent<React.TouchEventHandler<Element>>((event) => {
        // actions:
        // event.preventDefault(); // do not preventing, causing the click_to_focus doesn't work
        
        
        
        // logs:
        inputLogs.logTouchEvent(event.nativeEvent, true /*touch_down*/, actionTouches);
        if (watchGlobalTouch(true) === true) {
            // console.log({activeKeys: inputLogs.activeKeys});
            
            if (enableTouchScroll) {
                const touchX = (event.touches.length === 1 /* no multi touch for scrolling */) ? event.touches[0].clientX : undefined;
                if (touchX !== undefined) touchStartRef.current = touchX;
            }
            else {
                // simulates the Touch(Start|End|Cancel) as Mouse(Down|Up):
                handlePointerDown(
                    new MouseEvent((event?.type === 'touchstart') ? 'mousedown' : 'mouseup', {
                        // simulates for `onPointerCaptureCancel(event)` & `onPointerCaptureEnd(event)`:
                        ...event.nativeEvent,
                        ...(() => {
                            const isTouchStart = event?.type === 'touchstart';
                            const touch        = isTouchStart ? event?.touches?.[0] : event?.changedTouches?.[0];
                            return {
                                clientX : touch?.clientX ?? 0,
                                clientY : touch?.clientY ?? 0,
                                
                                screenX : touch?.screenX ?? 0,
                                screenY : touch?.screenY ?? 0,
                                
                                pageX   : touch?.pageX   ?? 0,
                                pageY   : touch?.pageY   ?? 0,
                                
                                button  : isTouchStart ? 1 : 0, // if touched: simulates primary button (usually the left button), otherwise simulates no button pressed
                                buttons : isTouchStart ? 1 : 0, // if touched: simulates primary button (usually the left button), otherwise simulates no button pressed
                            };
                        })(),
                    }),
                );
            } // if
        } // if
    });
    const handlePointerDown       = useEvent((event: MouseEvent): void => {
        // conditions:
        const variablesElm = variablesRef.current;
        if (!variablesElm) return;
        
        const bodyElm = bodyRef.current;
        if (!bodyElm) return;
        
        
        
        const { x } = variablesElm.getBoundingClientRect();
        const relativePosition = event.clientX - x;
        const valuePosition    = relativePosition / baseScale;
        
        
        
        setSelectionStart(valuePosition);
        setSelectionEnd(null);
    });
    
    const handleMouseMove         = useEvent<React.MouseEventHandler<Element>>((event) => {
        handlePointerMove(event.nativeEvent);
    });
    const handleTouchMove         = useEvent<React.TouchEventHandler<Element>>((event) => {
        if (enableTouchScroll) {
            // conditions:
            const bodyElm = bodyRef.current;
            if (!bodyElm) return;
            
            
            
            // actions:
            const touchX = (event.touches.length === 1 /* no multi touch for scrolling */) ? event.touches[0].clientX : undefined;
            if (touchX !== undefined) {
                bodyElm.scrollLeft += (touchStartRef.current - touchX);
                touchStartRef.current = touchX; // restart the pos
            } // if
            
            
            
            return; // handled => done
        } // if
        
        
        
        // simulates the TouchMove as MouseMove:
        handlePointerMove(
            new MouseEvent('mousemove', {
                // simulates for `onPointerCaptureStart(event)` & `onPointerCaptureMove(event)`:
                ...event.nativeEvent,
                ...(() => {
                    const touch = event?.touches?.[0];
                    return {
                        clientX : touch?.clientX ?? 0,
                        clientY : touch?.clientY ?? 0,
                        
                        screenX : touch?.screenX ?? 0,
                        screenY : touch?.screenY ?? 0,
                        
                        pageX   : touch?.pageX   ?? 0,
                        pageY   : touch?.pageY   ?? 0,
                        
                        button  : 1, // primary button (usually the left button)
                        buttons : 1, // primary button (usually the left button)
                    };
                })(),
            }),
        );
    });
    const handlePointerMove       = useEvent((event: MouseEvent): void => {
        // conditions:
        const variablesElm = variablesRef.current;
        if (!variablesElm) return;
        
        if (!inputLogs.isMouseActive && !inputLogs.isTouchActive) return; // no active pointer => ignore
        
        
        
        const { x } = variablesElm.getBoundingClientRect();
        const relativePosition = event.clientX - x;
        const valuePosition    = relativePosition / baseScale;
        
        
        
        setSelectionEnd(valuePosition);
    });
    const handlePointerUp         = useEvent((event: MouseEvent): void => {
        // conditions:
        if ((selectionStart === null) || (selectionEnd === null)) return; // no selectionRange => ignore
        
        const bodyElm = bodyRef.current;
        if (!bodyElm) return;
        
        
        
        const viewRange    = Math.abs(selectionStart - selectionEnd) * baseScale;
        const clientArea   = bodyElm.getBoundingClientRect().width;
        const targetScale  = clientArea / viewRange;
        const reZoom       = Math.log10(targetScale) / Math.log10(2);
        setZoom((current) => current + reZoom);
        
        setTimeout(handleScrollToSelection, 0); // scroll to the beginning of selection after the new zoom is completed:
    });
    const handleScrollToSelection = useEvent(() => {
        // conditions:
        if ((selectionStart === null) || (selectionEnd === null)) return; // no selectionRange => ignore
        
        const bodyElm = bodyRef.current;
        if (!bodyElm) return;
        
        
        
        const scrollTo = (Math.min(selectionStart, selectionEnd) * baseScale);
        bodyElm.scrollLeft = scrollTo;
        
        setSelectionStart(null);
        setSelectionEnd(null);
    });
    
    const handleClick             = useEvent<React.MouseEventHandler<Element>>((event) => {
        // conditions:
        if ((selectionStart !== null) && (selectionEnd !== null)) return; // ignore if selectionRange is active
        
        const bodyElm = bodyRef.current;
        if (!bodyElm) return;
        
        
        
        const { x } = bodyElm.getBoundingClientRect();
        const relativePosition = event.clientX - x + bodyElm.scrollLeft;
        const valuePosition    = relativePosition / baseScale;
        
        
        
        if (isAltPressed()) {
            setAltSelection(valuePosition);
        }
        else {
            setMainSelection(valuePosition);
        } // if
    });
    
    const handleZoomOut           = useEvent(() => {
        setZoom((current) => Math.round(current - 1));
    });
    const handleZoomIn            = useEvent(() => {
        setZoom((current) => Math.round(current + 1));
    });
    
    const handleGotoEdge          = useEvent((gotoNext: boolean, predicate?: ((wave: VcdWave) => boolean), allVariables: boolean = false) => {
        if (!allVariables && (focusedVariable === null)) return;
        const waves         = (
            (
                !allVariables
                ? allVcdVariables[focusedVariable ?? 0].waves
                : (
                    allVcdVariables
                    .flatMap(({ waves }) => waves)
                    .sort((a, b) => a.tick - b.tick)
                )
            )
            ??
            []
        );
        const isAlt         = !allVariables ? isAltPressed() : false;
        let   current       = isAlt ? altSelection : mainSelection;
        if (current === null) {
            if (!allVariables) return;
            current = minTick;
        } // if
        let   target        = waves[gotoNext ? 'find' : 'findLast']((wave) => (gotoNext ? (wave.tick > current) : (wave.tick < current)) && (!predicate || predicate(wave)));
        const dummyEdge     = {
            ...(gotoNext ? waves[waves.length - 1] : waves[0]),
            tick: gotoNext ? maxTick : minTick,
        } satisfies VcdWave;
        if ((target === undefined) && (!predicate || predicate(dummyEdge))) target = dummyEdge;
        if (target === undefined) return;
        const selectionPos = target.tick;
        (isAlt ? setAltSelection : setMainSelection)(selectionPos);
        
        
        
        const bodyElm = bodyRef.current;
        if (!bodyElm) return;
        const scrollPosStart = bodyElm.scrollLeft / baseScale;
        const clientArea     = bodyElm.getBoundingClientRect().width;
        const scrollPosEnd   = scrollPosStart + (clientArea / baseScale);
        if ((selectionPos <= scrollPosStart) || (selectionPos >= scrollPosEnd)) { // if out of view
            bodyElm.scrollLeft = (selectionPos * baseScale) - (clientArea / 2);
        } // if
    });
    
    const handleGotoPrevEdgeNeg   = useEvent(() => {
        handleGotoEdge(false, (wave) => (wave.value === 0));
    });
    const handleGotoPrevEdgePos   = useEvent(() => {
        handleGotoEdge(false, (wave) => (wave.value === 1));
    });
    
    const handleGotoPrevSearch    = useEvent(() => {
        switch (searchType) {
            case SearchType.TIME :
                const searchNum = Number.parseFloat(search);
                if (isNaN(searchNum)) return;
                setMainSelection(searchNum);
                break;
            case SearchType.HEX  :
                handleGotoEdge(false, (wave) => (wave.value.toString(16).toLowerCase().includes(search.toLowerCase())), true);
                break;
        } // switch
    });
    const handleGotoNextSearch    = useEvent(() => {
        switch (searchType) {
            case SearchType.TIME :
                const searchNum = Number.parseFloat(search);
                if (isNaN(searchNum)) return;
                setMainSelection(searchNum);
                break;
            case SearchType.HEX  :
                handleGotoEdge(true, (wave) => (wave.value.toString(16).toLowerCase().includes(search.toLowerCase())), true);
                break;
        } // switch
    });
    
    const handleGotoPrevEdge      = useEvent(() => {
        handleGotoEdge(false);
    });
    const handleGotoNextEdge      = useEvent(() => {
        handleGotoEdge(true);
    });
    
    const handleGotoNextEdgeNeg   = useEvent(() => {
        handleGotoEdge(true, (wave) => (wave.value === 0));
    });
    const handleGotoNextEdgePos   = useEvent(() => {
        handleGotoEdge(true, (wave) => (wave.value === 1));
    });
    
    const handleToggleTouchScroll = useEvent(() => {
        setEnableTouchScroll((current) => !current);
    });
    
    
    
    // global handlers:
    const watchGlobalKeyStatusRef = useRef<undefined|(() => void)>(undefined);
    const watchGlobalKey = useEvent((active: boolean): boolean|null => {
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
            //     // TODO: update keydown deactivated
            } // if
        };
        
        
        
        // actions:
        if (shouldActive) {
            window.addEventListener('keyup'   , handleKeyUp);
            
            
            
            // cleanups later:
            watchGlobalKeyStatusRef.current = () => {
                window.removeEventListener('keyup'   , handleKeyUp);
            };
        }
        else {
            // cleanups:
            watchGlobalKeyStatusRef.current?.();
            watchGlobalKeyStatusRef.current = undefined;
        } // if
        
        
        
        return shouldActive;
    });
    const watchGlobalMouseStatusRef = useRef<undefined|(() => void)>(undefined);
    const watchGlobalMouse = useEvent((active: boolean): boolean|null => {
        // conditions:
        const shouldActive = active /* && enabled */;
        if (!!watchGlobalMouseStatusRef.current === shouldActive) return null; // already activated|deactivated => nothing to do
        
        
        
        // handlers:
        const handleMouseUp = (event: MouseEvent): void => {
            // logs:
            inputLogs.logMouseEvent(event, false /*mouse_up*/, actionMouses);
            if (watchGlobalMouse(false) === false) {
                // console.log({activeKeys: inputLogs.activeKeys});
                handlePointerUp(event);
            } // if
        };
        
        
        
        // actions:
        if (shouldActive) {
            window.addEventListener('mouseup' , handleMouseUp);
            
            
            
            // cleanups later:
            watchGlobalMouseStatusRef.current = () => {
                window.removeEventListener('mouseup' , handleMouseUp);
            };
        }
        else {
            // cleanups:
            watchGlobalMouseStatusRef.current?.();
            watchGlobalMouseStatusRef.current = undefined;
        } // if
        
        
        
        return shouldActive;
    });
    const watchGlobalTouchStatusRef = useRef<undefined|(() => void)>(undefined);
    const watchGlobalTouch = useEvent((active: boolean): boolean|null => {
        // conditions:
        const shouldActive = active /* && enabled */;
        if (!!watchGlobalTouchStatusRef.current === shouldActive) return null; // already activated|deactivated => nothing to do
        
        
        
        // handlers:
        const handleTouchEnd = (event: TouchEvent): void => {
            // logs:
            inputLogs.logTouchEvent(event, false /*touch_up*/, actionTouches);
            if (watchGlobalTouch(false) === false) {
                // console.log({activeKeys: inputLogs.activeKeys});
                
                // simulates the TouchEnd as MouseUp:
                handlePointerUp(
                    new MouseEvent('mouseup', {
                        ...event,
                        ...(() => {
                            const touch = event?.touches?.[0];
                            return {
                                clientX : touch?.clientX ?? 0,
                                clientY : touch?.clientY ?? 0,
                                
                                screenX : touch?.screenX ?? 0,
                                screenY : touch?.screenY ?? 0,
                                
                                pageX   : touch?.pageX   ?? 0,
                                pageY   : touch?.pageY   ?? 0,
                                
                                button  : 0, // simulates no button pressed
                                buttons : 0, // simulates no button pressed
                            };
                        })(),
                    }),
                );
            } // if
        };
        
        
        
        // actions:
        if (shouldActive) {
            window.addEventListener('touchend', handleTouchEnd);
            
            
            
            // cleanups later:
            watchGlobalTouchStatusRef.current = () => {
                window.removeEventListener('touchend', handleTouchEnd);
            };
        }
        else {
            // cleanups:
            watchGlobalTouchStatusRef.current?.();
            watchGlobalTouchStatusRef.current = undefined;
        } // if
        
        
        
        return shouldActive;
    });
    
    
    
    // effects:
    useIsomorphicLayoutEffect(() => {
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
        // reserved for future defaults
        
        
        
        // other props:
        ...restDivProps
    } = restVcdViewerProps;
    
    
    
    // jsx:
    return (
        <div
            // other props:
            {...restDivProps}
            
            
            
            // classes:
            className={cn(props.className, styles.main)}
            
            
            
            // handlers:
            onKeyDown={handleKeyDown}
        >
            <div className={styles.toolbar}>
                <button onClick={handleZoomOut}>-</button>
                <button onClick={handleZoomIn}>+</button>
                
                <button onClick={handleGotoPrevEdgeNeg} disabled={!isBinarySelection}>v&lt;=</button>
                <button onClick={handleGotoPrevEdgePos} disabled={!isBinarySelection}>^&lt;=</button>
                
                <button onClick={handleGotoPrevEdge}>&lt;=</button>
                <button onClick={handleGotoNextEdge}>=&gt;</button>
                
                <button onClick={handleGotoNextEdgePos} disabled={!isBinarySelection}>=&gt;^</button>
                <button onClick={handleGotoNextEdgeNeg} disabled={!isBinarySelection}>=&gt;v</button>
                
                <input type='search' placeholder='Search' value={search} onChange={({currentTarget: { value }}) => setSearch(value)} />
                <button onClick={() => setSearchType(SearchType.TIME)} className={(searchType === SearchType.TIME) ? 'active' : ''}>by time</button>
                <button onClick={() => setSearchType(SearchType.HEX)} className={(searchType === SearchType.HEX) ? 'active' : ''}>by hex</button>
                <button onClick={handleGotoPrevSearch} disabled={searchType !== SearchType.HEX}>prev search</button>
                <button onClick={handleGotoNextSearch}>next search</button>
                
                <button onClick={handleToggleTouchScroll} className={enableTouchScroll ? 'active' : ''}>touch scroll</button>
            </div>
            <div
                // refs:
                ref={bodyRef}
                
                
                
                // classes:
                className={cn(props.className, styles.body)}
            >
                {/* ruler: */}
                <svg ref={svgRef} className={styles.ruler}>
                    <g ref={rulerRef} transform='translate(0, 20)' />
                </svg>
                
                {/* variables */}
                <div
                    // refs:
                    ref={variablesRef}
                    
                    
                    
                    // classes:
                    className={styles.variables}
                    
                    
                    
                    // handlers:
                    onClick={handleClick}
                    
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    
                    onMouseMove={handleMouseMove}
                    onTouchMove={handleTouchMove}
                >
                    {!!vcd && allVcdVariables.map(({ waves, lsb, msb, size, name }, index) =>
                        <div key={index}  className={cn(styles.variable, (focusedVariable === index) ? 'focus' : null)} tabIndex={0} onFocus={() => setFocusedVariable(index)}>
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
                </div>
                
                {/* selection */}
                {(mainSelection !== null) && <div className={cn(styles.selection, 'main')} style={{'--position': mainSelection * baseScale} as any} />}
                {(altSelection  !== null) && <div className={cn(styles.selection, 'alt' )} style={{'--position': altSelection  * baseScale} as any} />}
                {(selectionStart !== null) && (selectionEnd !== null) && <div className={styles.selectionRange} style={{'--selStart': Math.min(selectionStart, selectionEnd)  * baseScale, '--selEnd': Math.max(selectionStart, selectionEnd) * baseScale} as any} />}
            </div>
        </div>
    );
};
export {
    VcdViewer,            // named export for readibility
    VcdViewer as default, // default export to support React.lazy
}
