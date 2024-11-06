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
    useMergeEvents,
    usePointerCapturable,
}                           from '@reusable-ui/core'

// models:
import {
    type VcdVariable,
    type Vcd,
    type VcdWave,
    type VcdWaveExtended,
    
    VcdValueFormat,
    vcdValueToString,
    
    defaultColorOptions,
    vcdTimescaleToString,
}                           from '@/models'
import type Color           from 'color'

// utilities:
import {
    flatMapVariables,
    getVariableMinTick,
    getVariableMaxTick,
    getModulesOfVariable,
    moveVcdVariableData,
    
    actionKeys,
    actionMouses,
    actionTouches,
}                           from './utilities'
import {
    produce,
}                           from 'immer'
import {
    type ValueChangeEventHandler,
    useControllableAndUncontrollable,
}                           from '@heymarco/events'

// components:
import {
    DialogMessageProvider,
    useDialogMessage,
}                           from '@reusable-ui/components'
import {
    SimpleEditModelDialog,
}                           from '@/components/dialogs/SimpleEditModelDialog'
import {
    TimescaleEditor,
}                           from '@/components/editors/TimescaleEditor'



// react components:
export interface VcdEditorProps
    extends
        // bases:
        Omit<React.HTMLAttributes<HTMLDivElement>,
            |'children' // no nested children
        >
{
    // values:
    defaultVcd   ?: Vcd|null
    vcd          ?: Vcd|null
    onVcdChange  ?: ValueChangeEventHandler<Vcd|null>
    
    vcdVersion   ?: any
    
    vcdBlank     ?: Vcd|null
    
    colorOptions ?: Color[]
}
const VcdEditor = (props: VcdEditorProps): JSX.Element|null => {
    // jsx:
    return (
        <DialogMessageProvider>
            <VcdEditorInternal {...props} />
        </DialogMessageProvider>
    );
};
const VcdEditorInternal = (props: VcdEditorProps): JSX.Element|null => {
    // props:
    const {
        // values:
        defaultVcd   : defaultUncontrollableVcd = null,
        vcd          : controllableVcd,
        onVcdChange  : onControllableVcdChange,
        
        vcdVersion   = controllableVcd,
        
        vcdBlank     = null,
        
        colorOptions = defaultColorOptions,
        
        
        
        // other props:
        ...restVcdEditorProps
    } = props;
    
    
    
    // states:
    const handleControllableVcdChangeInternal = useEvent<ValueChangeEventHandler<Vcd|null>>((newVcd) => {
        // actions:
        setAllVcdVariables(
            newVcd ? flatMapVariables(newVcd.rootModule) : []
        );
        setRemovedVariables([]); // clear
    });
    const handleControllableVcdChange = useMergeEvents(
        // preserves the original `onChange` from `props`:
        onControllableVcdChange,
        
        
        
        // validations:
        handleControllableVcdChangeInternal,
    );
    const {
        value              : vcd,
        triggerValueChange : triggerVcdChange,
    } = useControllableAndUncontrollable<Vcd|null>({
        defaultValue       : defaultUncontrollableVcd,
        value              : controllableVcd,
        onValueChange      : handleControllableVcdChange,
    });
    
    
    
    // states:
    const minTick           = !vcd ? 0 : getVariableMinTick(vcd.rootModule);
    const maxTick           = !vcd ? 0 : getVariableMaxTick(vcd.rootModule);
    const [allVcdVariables, setAllVcdVariables] = useState<VcdVariable[]>(() => vcd ? flatMapVariables(vcd.rootModule) : []);
    const prevVcdVersion = useRef(vcdVersion);
    useIsomorphicLayoutEffect(() => {
        // conditions:
        if (prevVcdVersion.current === vcdVersion) return; // no changes detected => ignore
        prevVcdVersion.current = vcdVersion; // sync
        
        
        
        // actions:
        setAllVcdVariables(
            vcd ? flatMapVariables(vcd.rootModule) : []
        );
        setRemovedVariables([]); // clear
    }, [vcd, vcdVersion]); // resets the `allVcdVariables` when vcd changes
    
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
    
    const [showMenu         , setShowMenu         ] = useState<{ x: number, y: number}|null>(null);
    const [showMenuValues   , setShowMenuValues   ] = useState<{ x: number, y: number}|null>(null);
    const [showMenuColors   , setShowMenuColors   ] = useState<{ x: number, y: number}|null>(null);
    
    const [showMenuList     , setShowMenuList     ] = useState<{ x: number, y: number}|null>(null);
    const [removedVariables , setRemovedVariables ] = useState<VcdVariable[]>([]);
    
    const [showMenuFile     , setShowMenuFile     ] = useState<{ x: number, y: number}|null>(null);
    
    const hoverCursorPosRef                         = useRef<number|null>();
    const hoverTickRef                              = useRef<number|null>();
    
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
    
    
    
    // capabilities:
    const [moveFromIndex, setMoveFromIndex] = useState<number|null>(null);
    const [moveToIndex  , setMoveToIndex  ] = useState<number|null>(null);
    
    const movePosOriginRef  = useRef({ x: 0, y: 0 });
    const [movePosRelative, setMovePosRelative] = useState({ x: 0, y: 0 });
    const pointerCapturable = usePointerCapturable({
        onPointerCaptureStart(event) {
            // updates:
            movePosOriginRef.current.x = event.screenX;
            movePosOriginRef.current.y = event.screenY;
            setMovePosRelative(movePosOriginRef.current);
        },
        onPointerCaptureCancel(event) {
            // cleanups:
            setMoveFromIndex(null);
            setMoveToIndex(null);
        },
        onPointerCaptureEnd(event) {
            handleApplyDrop();
            
            
            
            // cleanups:
            setMoveFromIndex(null);
            setMoveToIndex(null);
        },
        onPointerCaptureMove(event) {
            // updates:
            setMovePosRelative({
                x : (event.screenX - movePosOriginRef.current.x),
                y : (event.screenY - movePosOriginRef.current.y),
            });
            
            
            
            // test droppable target:
            const droppableElms = document.elementsFromPoint(event.clientX, event.clientY);
            const newMoveToIndex  = (
                droppableElms
                .map((droppableElm) => {
                    const droppableData = droppableElm ? (droppableElm as HTMLElement)?.dataset?.droppable : undefined;
                    if (!droppableData) return undefined;
                    const newMoveToIndex = Number.parseInt(droppableData);
                    if (isNaN(newMoveToIndex)) return undefined;
                    return newMoveToIndex;
                })
                .find((newMoveToIndex): newMoveToIndex is Exclude<typeof newMoveToIndex, undefined> => (newMoveToIndex !== undefined))
            );
            if (newMoveToIndex !== undefined) handlePreviewMove(newMoveToIndex);
        },
    });
    const handlePreviewMove = useEvent((newMoveToIndex: number) => {
        if (newMoveToIndex !== moveToIndex) setMoveToIndex(newMoveToIndex);
    });
    const handleApplyDrop   = useEvent(() => {
        // apply changes:
        if ((moveFromIndex !== null) && (moveToIndex !== null)) {
            setAllVcdVariables(
                moveVcdVariableData(allVcdVariables, moveFromIndex, moveToIndex)
            );
        } // if
        
        
        
        // restore focus:
        if (focusedVariable !== null) {
            const focusMap = new Array<undefined|true>(allVcdVariables.length);
            focusMap[focusedVariable] = true;
            const newFocusMap = moveVcdVariableData(focusMap, moveFromIndex, moveToIndex);
            const newFocusedVariable = newFocusMap.findIndex((val) => (val === true))
            setFocusedVariable(newFocusedVariable);
        } // if
    });
    
    
    
    // refs:
    const mainRef       = useRef<HTMLDivElement|null>(null);
    const svgRef        = useRef<SVGSVGElement|null>(null);
    const bodyRef       = useRef<HTMLDivElement|null>(null);
    const rulerRef      = useRef<SVGGElement|null>(null);
    const variablesRef  = useRef<HTMLDivElement|null>(null);
    const menuRef       = useRef<HTMLUListElement|null>(null);
    const menuValuesRef = useRef<HTMLUListElement|null>(null);
    const menuColorsRef = useRef<HTMLUListElement|null>(null);
    const menuListRef   = useRef<HTMLUListElement|null>(null);
    const menuFileRef   = useRef<HTMLUListElement|null>(null);
    
    
    
    // utilities:
    const isAltPressed = useEvent((): boolean => {
        return inputLogs.activeKeys.has('altleft') || inputLogs.activeKeys.has('altright')
    });
    const isCtrlPressed = useEvent((): boolean => {
        return inputLogs.activeKeys.has('controlleft') || inputLogs.activeKeys.has('controlright')
    });
    const isShiftPressed = useEvent((): boolean => {
        return inputLogs.activeKeys.has('shiftleft') || inputLogs.activeKeys.has('shiftright')
    });
    
    
    
    // dialogs:
    const {
        showDialog,
    } = useDialogMessage();
    
    
    
    // handlers:
    const handleKeyDown           = useEvent<React.KeyboardEventHandler<Element>>((event) => {
        // conditions:
        if ((event.target as Element)?.tagName === 'INPUT') return; // do not intercept <input>
        
        
        
        // conditions:
        /* note: the `code` may `undefined` on autoComplete */
        const keyCode = (event.code as string|undefined)?.toLowerCase();
        if (!keyCode) return; // ignores [unidentified] key
        if (['controlleft', 'controlright', 'escape'].includes(keyCode)) return; // ignore [ctrl][escape] key, we handle it globally
        
        
        
        // actions:
        if (!['tab'].includes(keyCode)) event.preventDefault();
        
        
        
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
    
    const globalHandleKeyDown     = useEvent((event: KeyboardEvent) => {
        // conditions:
        /* note: the `code` may `undefined` on autoComplete */
        const keyCode = (event.code as string|undefined)?.toLowerCase();
        if (!keyCode) return; // ignores [unidentified] key
        if (!['controlleft', 'controlright', 'shiftleft', 'shiftright', 'escape'].includes(keyCode)) return; // only interested of [ctrl] key
        
        
        
        // logs:
        inputLogs.logKeyEvent(event, true /*key_down*/, actionKeys);
        if (watchGlobalKey(true) === true) {
            // console.log({activeKeys: inputLogs.activeKeys});
            // TODO: update keydown activated
            if (keyCode === 'escape') {
                handleHideAllMenus();
            } // if
        } // if
    });
    const globalHandleWheel       = useEvent((event: WheelEvent) => {
        // conditions:
        if (!mainRef.current || !document.elementsFromPoint(event.clientX, event.clientY).includes(mainRef.current)) return; // the cursor is not on top mainElm => ignore
        if (isCtrlPressed()) {
            event.preventDefault();
            
            if (event.deltaY < 0) {
                handleZoomIn();
            }
            else {
                handleZoomOut();
            } // if
            
            return; // intercepted => done
        }
        else if (isShiftPressed()) {
            event.preventDefault();
            
            const bodyElm = bodyRef.current;
            if (bodyElm) bodyElm.scrollLeft += event.deltaY;
            
            return; // intercepted => done
        } // if
    });
    const globalHandleMouseDown   = useEvent((event: MouseEvent) => {
        // conditions:
        const targetElm = event.target as Element|null;
        if (targetElm) {
            if (menuRef.current && menuRef.current.contains(targetElm)) return;
            if (menuValuesRef.current && menuValuesRef.current.contains(targetElm)) return;
            if (menuColorsRef.current && menuColorsRef.current.contains(targetElm)) return;
            if (menuListRef.current && menuListRef.current.contains(targetElm)) return;
            if (menuFileRef.current && menuFileRef.current.contains(targetElm)) return;
        } // if
        
        
        
        // actions:
        handleHideAllMenus();
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
        
        const bodyElm = bodyRef.current;
        if (!bodyElm) return;
        
        
        
        const { left, width } = bodyElm.getBoundingClientRect();
        hoverCursorPosRef.current =
            Math.min(1, Math.max(0,
                (event.clientX - left)
                / width
            ));
        
        
        
        const { x } = variablesElm.getBoundingClientRect();
        const relativePosition = event.clientX - x;
        const valuePosition    = relativePosition / baseScale;
        hoverTickRef.current   = valuePosition;
        
        
        
        if (!inputLogs.isMouseActive && !inputLogs.isTouchActive) return; // no active pointer => ignore
        
        
        
        if ((selectionStart === null) || Math.abs(valuePosition - selectionStart) < 2) return; // ignore very small selection
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
    
    const handleZoomOutClick      = useEvent(() => {
        hoverTickRef.current      = null;
        hoverCursorPosRef.current = null;
        handleZoomOut();
    });
    const handleZoomOut           = useEvent(() => {
        setZoom((currentZoom) => {
            setTimeout(() => handleScrollToPointer(currentZoom), 0); // scroll to current pointer pos
            return Math.round(currentZoom - 1);
        });
    });
    const handleZoomInClick       = useEvent(() => {
        hoverTickRef.current      = null;
        hoverCursorPosRef.current = null;
        handleZoomIn();
    });
    const handleZoomIn            = useEvent(() => {
        setZoom((currentZoom) => {
            setTimeout(() => handleScrollToPointer(currentZoom), 0); // scroll to current pointer pos
            return Math.round(currentZoom + 1);
        });
    });
    const handleScrollToPointer = useEvent((prevZoom: number) => {
        // conditions:
        const bodyElm = bodyRef.current;
        if (!bodyElm) return;
        
        
        
        const rangeTick                = maxTick - minTick;
        const highlightTick            = hoverTickRef.current ?? ((): number => {
            const prevBaseScale = 2 ** prevZoom;
            const tickOnCenterScreen = (
                (bodyElm.scrollLeft / prevBaseScale)
                +
                (bodyElm.clientWidth / 2 / prevBaseScale)
            );
            // console.log('tickOnCenterScreen: ', tickOnCenterScreen);
            return tickOnCenterScreen;
        })();
        const centerTick               = rangeTick * (hoverCursorPosRef.current ?? 0.5);
        const lastWaveMinInlineSize    = 40;
        
        // setMainSelection(centerTick); // for visual debugging purpose
        const maxScroll    = bodyElm.scrollWidth - bodyElm.clientWidth;
        bodyElm.scrollLeft = Math.min(maxScroll, Math.max(0,
            (maxScroll * ((centerTick) / rangeTick)) - (lastWaveMinInlineSize / 2) + ((highlightTick - centerTick) * baseScale)
        ));
    });
    
    const handleGotoEdge          = useEvent((gotoNext: boolean, predicate?: ((wave: VcdWave, variable: VcdVariable) => boolean), allVariables: boolean = false) => {
        const wavesGroup = (
            (
                allVariables
                ? (
                    allVcdVariables
                    .flatMap((variable) =>
                        variable.waves.map((wave) => ({ variable, wave }))
                    )
                )
                : (() => {
                    if (focusedVariable === null) return []
                    const variable = allVcdVariables[focusedVariable];
                    return variable.waves.map((wave) => ({ variable, wave }))
                })()
            )
            .toSorted((a, b) => a.wave.tick - b.wave.tick)
            ??
            []
        );
        const isAlt         = !allVariables ? isAltPressed() : false;
        let   current       = isAlt ? altSelection : mainSelection;
        if (current === null) {
            if (!allVariables) return;
            current = minTick;
        } // if
        let   target        = wavesGroup[gotoNext ? 'find' : 'findLast'](({variable, wave}) => (gotoNext ? (wave.tick > current) : (wave.tick < current)) && (!predicate || predicate(wave, variable)))?.wave;
        const variableEdge  = (gotoNext ? wavesGroup[wavesGroup.length - 1] : wavesGroup[0]);
        const dummyEdge     = {
            ...variableEdge.wave,
            tick: gotoNext ? maxTick : minTick,
        } satisfies VcdWave;
        if ((target === undefined) && (!predicate || predicate(dummyEdge, variableEdge.variable))) target = dummyEdge;
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
                handleGotoEdge(false, (wave, { format }) => (vcdValueToString(wave.value, format).toLowerCase().includes(search.toLowerCase())), true);
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
                handleGotoEdge(true, (wave, { format }) => (vcdValueToString(wave.value, format).toLowerCase().includes(search.toLowerCase())), true);
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
    
    const handleContextMenu       = useEvent<React.MouseEventHandler<HTMLSpanElement>>((event) => {
        event.preventDefault(); // handled
        
        
        
        setShowMenu({
            x : event.pageX - (mainRef.current?.offsetLeft ?? 0),
            y : event.pageY - (mainRef.current?.offsetTop ?? 0),
        });
    });
    const handleMenuSetColor      = useEvent<React.MouseEventHandler<HTMLElement>>((event) => {
        const { top, right } = event.currentTarget.getBoundingClientRect();
        setShowMenuColors({
            x : (right - 2) - (mainRef.current?.offsetLeft ?? 0),
            y : top - (mainRef.current?.offsetTop ?? 0),
        });
    });
    const handleMenuSetColorHideAbortRef = useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
    const handleMenuSetColorHide  = useEvent<React.MouseEventHandler<HTMLElement>>((event) => {
        clearTimeout(handleMenuSetColorHideAbortRef.current);
        handleMenuSetColorHideAbortRef.current = setTimeout(() => {
            // conditions:
            if (!menuColorsRef.current || document.elementsFromPoint(event.clientX, event.clientY).includes(menuColorsRef.current)) return; // the cursor is on top menuColorsElm => ignore
            
            
            
            if (showMenuColors) setShowMenuColors(null);
        }, 100);
    });
    const handleMenuRemove        = useEvent(() => {
        if (focusedVariable === null) return;
        
        handleMenuListRemoveOf(focusedVariable);
        
        handleHideAllMenus();
    });
    const handleMenuFormatValues  = useEvent<React.MouseEventHandler<HTMLElement>>((event) => {
        const { top, right } = event.currentTarget.getBoundingClientRect();
        setShowMenuValues({
            x : (right - 2) - (mainRef.current?.offsetLeft ?? 0),
            y : top - (mainRef.current?.offsetTop ?? 0),
        });
    });
    const handleMenuFormatValuesHideAbortRef = useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
    const handleMenuFormatValuesHide = useEvent<React.MouseEventHandler<HTMLElement>>((event) => {
        clearTimeout(handleMenuFormatValuesHideAbortRef.current);
        handleMenuFormatValuesHideAbortRef.current = setTimeout(() => {
            // conditions:
            if (!menuValuesRef.current || document.elementsFromPoint(event.clientX, event.clientY).includes(menuValuesRef.current)) return; // the cursor is on top menuValuesElm => ignore
            
            
            
            if (showMenuValues) setShowMenuValues(null);
        }, 100);
    });
    
    const handleMenuFormatOf = useEvent((format: VcdValueFormat) => {
        if (focusedVariable === null) return;
        setAllVcdVariables(
            produce(allVcdVariables, (allVcdVariables) => {
                const variable = allVcdVariables[focusedVariable];
                if (variable === undefined) return;
                variable.format = format;
            })
        );
        
        handleHideAllMenus();
    });
    const handleMenuFormatBinary = useEvent(() => {
        handleMenuFormatOf(VcdValueFormat.BINARY);
    });
    const handleMenuFormatDecimal = useEvent(() => {
        handleMenuFormatOf(VcdValueFormat.DECIMAL);
    });
    const handleMenuFormatHexadecimal = useEvent(() => {
        handleMenuFormatOf(VcdValueFormat.HEXADECIMAL);
    });
    const handleMenuColorOf = useEvent((color: Color) => {
        if (focusedVariable === null) return;
        setAllVcdVariables(
            produce(allVcdVariables, (allVcdVariables) => {
                const variable = allVcdVariables[focusedVariable];
                if (variable === undefined) return;
                variable.color = color;
            })
        );
        
        handleHideAllMenus();
    });
    
    const handleMenuList = useEvent<React.MouseEventHandler<HTMLSpanElement>>((event) => {
        const { left, right, bottom } = event.currentTarget.getBoundingClientRect();
        setShowMenuList({
            x : ((left + right) / 2) - (mainRef.current?.offsetLeft ?? 0),
            y : bottom + (document.scrollingElement?.scrollTop ?? 0) - (mainRef.current?.offsetTop ?? 0),
        });
    });
    const handleMenuListRemoveOf = useEvent((variableIndex: number) => {
        const mutated = allVcdVariables.slice(0);
        const removed = mutated.splice(variableIndex, 1);
        setAllVcdVariables(mutated);
        setRemovedVariables((current) => [...current, ...removed]);
    });
    const handleMenuListRestoreOf = useEvent((variableIndex: number) => {
        const mutated = removedVariables.slice(0);
        const restored = mutated.splice(variableIndex, 1);
        setRemovedVariables(mutated);
        setAllVcdVariables((current) => [...current, ...restored]);
    });
    
    const handleMenuFile = useEvent<React.MouseEventHandler<HTMLSpanElement>>((event) => {
        const { left, bottom } = event.currentTarget.getBoundingClientRect();
        setShowMenuFile({
            x : left - (mainRef.current?.offsetLeft ?? 0),
            y : bottom + (document.scrollingElement?.scrollTop ?? 0) - (mainRef.current?.offsetTop ?? 0),
        });
    });
    const handleMenuFileNewBlank = useEvent<React.MouseEventHandler<HTMLSpanElement>>((event) => {
        triggerVcdChange(vcdBlank, { triggerAt: 'immediately' });
        handleHideAllMenus();
    });
    const handleMenuFileSetTimescale = useEvent<React.MouseEventHandler<HTMLSpanElement>>(async (event) => {
        handleHideAllMenus();
        
        
        
        const currentTimescale = vcd?.timescale;
        const mockModel = {
            id        : '',
            timescale : currentTimescale,
        };
        const newTimescale = await showDialog<number>(
            <SimpleEditModelDialog
                model={mockModel}
                edit='timescale'
                editorComponent={
                    <TimescaleEditor theme='primary' />
                }
                viewport={mainRef}
            />
        );
        if (newTimescale === undefined) return;
        if (newTimescale === currentTimescale) return;
        triggerVcdChange({
            rootModule: {
                name       : 'root',
                variables  : [],
                submodules : [],
            },
            
            ...vcd,
            timescale : newTimescale,
        }, { triggerAt: 'immediately' });
    });
    
    const handleHideAllMenus = useEvent(() => {
        if (showMenu) setShowMenu(null);
        if (showMenuValues) setShowMenuValues(null);
        if (showMenuColors) setShowMenuColors(null);
        if (showMenuList) setShowMenuList(null);
        if (showMenuFile) setShowMenuFile(null);
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
                // console.log({activeKeys: inputLogs.activeKeys});
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
                d3.axisTop(ruler).ticks(50) as any
            );
        });
        resizeObserver.observe(svgElm, { box: 'border-box' });
        
        
        
        // cleanups:
        return () => {
            resizeObserver.disconnect();
        }
    }, [maxTick, baseScale]);
    
    useIsomorphicLayoutEffect(() => {
        // conditions:
        if (typeof(window) === 'undefined') return;
        
        
        
        // setups:
        window.addEventListener('keydown'  , globalHandleKeyDown);
        window.addEventListener('wheel'    , globalHandleWheel, { passive: false });
        window.addEventListener('mousedown', globalHandleMouseDown);
        
        
        
        // cleanups:
        return () => {
            window.removeEventListener('keydown'  , globalHandleKeyDown);
            window.removeEventListener('wheel'    , globalHandleWheel);
            window.removeEventListener('mousedown', globalHandleMouseDown);
        };
    }, []);
    
    
    
    // default props:
    const {
        // reserved for future defaults
        
        
        
        // other props:
        ...restDivProps
    } = restVcdEditorProps;
    
    
    
    // jsx:
    const moveableLabels : React.ReactNode[] = (
        vcd
        ? allVcdVariables.map((variable, index) =>
            <span
                key={index}
                className={cn(
                    styles.label,
                    ((moveFromIndex !== null) ? ((moveFromIndex === index) ? 'dragging' : 'dropZone') : null),
                )}
                style={(moveFromIndex === index) ?{
                    '--posX'         : movePosRelative.x,
                    '--posY'         : movePosRelative.y,
                    '--moveRelative' : (moveToIndex ?? index) - index,
                } as any : undefined}
            >
                <span className={styles.labelItemHandler} onPointerDown={() => setMoveFromIndex(index)} />
                <span>
                    {getModulesOfVariable(vcd, variable)?.slice(1).map(({name}) => name).join('.')}.{variable.name}
                </span>
            </span>
        )
        : []
    );
    const moveableValues : React.ReactNode[] = (
        ((mainSelection !== null) && allVcdVariables)
        ? (
            allVcdVariables
            .map(({ waves, format }) => ({
                format,
                waves: (
                    waves
                    .map((wave, index, waves): VcdWaveExtended => {
                        const prevIndex = index - 1;
                        const prevWave  = (prevIndex >= 0) ? waves[prevIndex] : undefined;
                        
                        const nextIndex = index + 1;
                        const nextWave  = (nextIndex < waves.length) ? waves[nextIndex] : undefined;
                        const nextTick  = nextWave?.tick ?? maxTick;
                        
                        return {
                            ...wave,
                            lastTick  : nextTick,
                            prevValue : (wave.tick === mainSelection) ? prevWave?.value : undefined,
                            nextValue : (nextTick  === mainSelection) ? nextWave?.value : undefined,
                        };
                    })
                ),
            }))
            .map(({ format, waves }) => ({
                format,
                selectedWave : waves.find(({ tick, lastTick }) => (mainSelection >= tick) && (mainSelection < lastTick)),
            }))
            .map(({ format, selectedWave }, index) =>
                <span
                    key={index}
                    className={cn(
                        styles.labelValue,
                        (((moveFromIndex !== null) && (moveFromIndex === index)) ? 'dragging' : null),
                    )}
                    style={(moveFromIndex === index) ?{
                        '--posX'         : movePosRelative.x,
                        '--posY'         : movePosRelative.y,
                        '--moveRelative' : (moveToIndex ?? index) - index,
                    } as any : undefined}
                >
                    {!!selectedWave && <>
                        {(selectedWave.prevValue !== undefined) && <><span>{vcdValueToString(selectedWave.prevValue, format)}</span><span>-</span></>}
                        <span>{vcdValueToString(selectedWave.value, format)}</span>
                        {(selectedWave.nextValue !== undefined) && <><span>-</span><span>{vcdValueToString(selectedWave.nextValue, format)}</span></>}
                    </>}
                </span>
            )
        )
        : []
    );
    const moveableVariables : React.ReactNode[] = (
        vcd
        ? allVcdVariables.map(({ waves, size, format, color }, index) =>
            <div
                key={index}
                className={cn(
                    styles.variable,
                    ((focusedVariable === index) ? 'focus' : null),
                    (((moveFromIndex !== null) && (moveFromIndex === index)) ? 'dragging' : null),
                )}
                style={{
                    ...((moveFromIndex === index) ? {
                        '--posX'         : movePosRelative.x,
                        '--posY'         : movePosRelative.y,
                        '--moveRelative' : (moveToIndex ?? index) - index,
                    } as any : undefined),
                    
                    ...((color !== null) ? {
                        '--color': color.hexa(),
                    } as any : undefined),
                }}
                tabIndex={0}
                onFocus={() => setFocusedVariable(index)}
                onContextMenu={handleContextMenu}
            >
                <div className={styles.waves}>
                    {!!waves.length && (waves[0].tick > minTick) && (() => {
                        const value    = waves[0].value;
                        const isError  = (typeof(value) === 'string') /* || ((lsb !== undefined) && (value < lsb)) || ((msb !== undefined) && (value > msb)) */;
                        const isBinary = (size === 1);
                        
                        
                        
                        // jsx:
                        const length = waves[0].tick * baseScale;
                        if (length === 0) return null;
                        return (
                            <span key={index} style={{ '--length': length } as any} className={cn('sync', styles.syncWave, isError ? 'error' : null, isBinary ? `bin ${value ? 'hi':'lo'}` : null)}>
                                {((typeof(value) === 'string') ? value : vcdValueToString(value, format))}
                            </span>
                        );
                    })()}
                    {waves.map(({tick, value}, index, waves) => {
                        const nextTick : number = (waves.length && ((index + 1) < waves.length)) ? waves[index + 1].tick : maxTick;
                        // if (nextTick === maxTick) return null;
                        const isError  = (typeof(value) === 'string') /* || ((lsb !== undefined) && (value < lsb)) || ((msb !== undefined) && (value > msb)) */;
                        const isBinary = (size === 1);
                        
                        
                        
                        // jsx:
                        const length = (nextTick - tick) * baseScale;
                        if (length === 0) return null;
                        return (
                            <span key={index} style={{ '--length': length } as any} className={cn(isError ? 'error' : null, isBinary ? `bin ${value ? 'hi':'lo'}` : null)}>
                                {!isBinary && ((typeof(value) === 'string') ? value : vcdValueToString(value, format))}
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
                        <span key={index} className={cn('last', styles.lastWave, isError ? 'error' : null, isBinary ? `bin ${value ? 'hi':'lo'}` : null)}>
                            {((typeof(value) === 'string') ? value : vcdValueToString(value, format))}
                        </span>
                    );
                })()}
            </div>
        )
        : []
    );
    return (
        <div
            // other props:
            {...restDivProps}
            
            
            
            // refs:
            ref={mainRef}
            
            
            
            // classes:
            className={cn(props.className, styles.main)}
            
            
            
            // handlers:
            onKeyDown={handleKeyDown}
        >
            <div className={styles.toolbar}>
                <button type='button' className='text' onClick={handleMenuFile}>File</button>
                
                <button type='button' className='zoom-out'  onClick={handleZoomOutClick} />
                <button type='button' className='zoom-in' onClick={handleZoomInClick} />
                
                <button type='button' className='prev-neg-edge' onClick={handleGotoPrevEdgeNeg} disabled={!isBinarySelection} />
                <button type='button' className='prev-pos-edge' onClick={handleGotoPrevEdgePos} disabled={!isBinarySelection} />
                
                <button type='button' className='prev-transition' onClick={handleGotoPrevEdge} />
                <button type='button' className='next-transition' onClick={handleGotoNextEdge} />
                
                <button type='button' className='next-neg-edge' onClick={handleGotoNextEdgePos} disabled={!isBinarySelection} />
                <button type='button' className='next-pos-edge' onClick={handleGotoNextEdgeNeg} disabled={!isBinarySelection} />
                
                <div className={styles.comboInput}>
                    <input type='search' placeholder='Search' value={search} onChange={({currentTarget: { value }}) => setSearch(value)} />
                    <button type='button' className={cn('text', (searchType === SearchType.TIME) ? 'active' : '')} onClick={() => setSearchType(SearchType.TIME)}>t=</button>
                    <button type='button' className={cn('text', (searchType === SearchType.HEX)  ? 'active' : '')} onClick={() => setSearchType(SearchType.HEX)} >hex</button>
                </div>
                <button type='button' className='prev' onClick={handleGotoPrevSearch} disabled={searchType !== SearchType.HEX} />
                <button type='button' className='next' onClick={handleGotoNextSearch} />
                
                <button type='button' className={cn('touch', (enableTouchScroll ? 'active' : null))} onClick={handleToggleTouchScroll} />
                
                <button type='button' className='list' onClick={handleMenuList} />
            </div>
            <div className={styles.bodyOuter}>
                <ul className={styles.labels}
                    onMouseDown={pointerCapturable.handleMouseDown}
                    onTouchStart={pointerCapturable.handleTouchStart}
                >
                    <li className={styles.rulerHack} />
                    {moveVcdVariableData(moveableLabels, moveFromIndex, moveToIndex).map((movedLabel, index) =>
                        <li
                            key={index}
                            className={styles.labelWrapper}
                            data-droppable={index}
                            // onMouseEnter={() => setMoveToIndex(index)} // works on mouse but doesn't on touch, so we use `elementsFromPoint()` strategy on `onPointerCaptureMove()`
                        >
                            {movedLabel}
                        </li>
                    )}
                    <li className={styles.scrollbarHack} />
                </ul>
                <ul className={styles.labels}>
                    <li className={styles.rulerHack} />
                    {moveVcdVariableData(moveableValues, moveFromIndex, moveToIndex).map((movedValue, index) =>
                        <li
                            key={index}
                            className={styles.labelWrapper}
                            data-droppable={index}
                        >
                            {movedValue}
                        </li>
                    )}
                    <li className={styles.scrollbarHack} />
                </ul>
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
                        {moveVcdVariableData(moveableVariables, moveFromIndex, moveToIndex).map((moveableVariable, index) =>
                            <div key={index} className={styles.variableWrapper}>
                                {moveableVariable}
                            </div>
                        )}
                    </div>
                    
                    {/* selection */}
                    {(mainSelection !== null) && <div className={cn(styles.selection, 'main')} style={{'--position': mainSelection * baseScale} as any} />}
                    {(altSelection  !== null) && <div className={cn(styles.selection, 'alt' )} style={{'--position': altSelection  * baseScale} as any} />}
                    {(selectionStart !== null) && (selectionEnd !== null) && <div className={styles.selectionRange} style={{'--selStart': Math.min(selectionStart, selectionEnd)  * baseScale, '--selEnd': Math.max(selectionStart, selectionEnd) * baseScale} as any} />}
                </div>
            </div>
            {!!showMenu && <ul ref={menuRef} className={styles.menu} style={{ insetInlineStart: `${showMenu.x}px`, insetBlockStart: `${showMenu.y}px` }}>
                {(focusedVariable !== null) && (allVcdVariables[focusedVariable]?.size > 1) && <li tabIndex={0} onClick={handleMenuFormatValues} onMouseEnter={handleMenuFormatValues} onMouseLeave={handleMenuFormatValuesHide}>Format Values<span className='drop-right' /></li>}
                <li tabIndex={0} onClick={handleMenuSetColor} onMouseEnter={handleMenuSetColor} onMouseLeave={handleMenuSetColorHide}>Change Color<span className='drop-right' /></li>
                <li tabIndex={0} onClick={handleMenuRemove}>Remove Signal</li>
            </ul>}
            {!!showMenuValues && <ul ref={menuValuesRef} className={styles.menu} style={{ insetInlineStart: `${showMenuValues.x}px`, insetBlockStart: `${showMenuValues.y}px` }}>
                <li tabIndex={0} onClick={handleMenuFormatBinary}>Binary</li>
                <li tabIndex={0} onClick={handleMenuFormatDecimal}>Decimal</li>
                <li tabIndex={0} onClick={handleMenuFormatHexadecimal}>Hexadecimal</li>
            </ul>}
            {!!showMenuColors && <ul ref={menuColorsRef} className={cn(styles.menu, styles.menuColors)} style={{ insetInlineStart: `${showMenuColors.x}px`, insetBlockStart: `${showMenuColors.y}px` }}>
                {colorOptions.map((color, index) =>
                    <li key={index} tabIndex={0} style={{ color: color.hexa() }} onClick={() => handleMenuColorOf(color)} />
                )}
            </ul>}
            {!!showMenuList && !!vcd && <ul ref={menuListRef} className={cn(styles.menu, styles.menuList)} style={{ insetInlineStart: `${showMenuList.x}px`, insetBlockStart: `${showMenuList.y}px` }}>
                {!!allVcdVariables.length && <>
                    <li className={styles.menuLabelGroup}>Shown Items:</li>
                    {moveVcdVariableData(allVcdVariables, moveFromIndex, moveToIndex).map((variable, index) =>
                        <li key={index} tabIndex={0}>
                            <input type='checkbox' checked={true} onChange={() => handleMenuListRemoveOf(index)} />
                            <span>
                                {getModulesOfVariable(vcd, variable)?.slice(1).map(({name}) => name).join('.')}.{variable.name}
                            </span>
                        </li>
                    )}
                </>}
                {!!removedVariables.length && <>
                    <li className={styles.menuLabelGroup}>Removed Items:</li>
                    {removedVariables.map((variable, index) =>
                        <li key={index} tabIndex={0}>
                            <input type='checkbox' checked={false} onChange={() => handleMenuListRestoreOf(index)} />
                            <span>
                                {getModulesOfVariable(vcd, variable)?.slice(1).map(({name}) => name).join('.')}.{variable.name}
                            </span>
                        </li>
                    )}
                </>}
            </ul>}
            {!!showMenuFile && <ul ref={menuFileRef} className={cn(styles.menu, styles.menuFile)} style={{ insetInlineStart: `${showMenuFile.x}px`, insetBlockStart: `${showMenuFile.y}px` }}>
                <li tabIndex={0} onClick={handleMenuFileNewBlank}>New Blank Document</li>
                <li tabIndex={0} onClick={handleMenuFileSetTimescale}>
                    <span>
                        Set Timescale
                    </span>
                    <span>
                        ({vcdTimescaleToString(vcd?.timescale ?? 1)})
                    </span>
                </li>
            </ul>}
        </div>
    );
};
export {
    VcdEditor,            // named export for readibility
    VcdEditor as default, // default export to support React.lazy
}
