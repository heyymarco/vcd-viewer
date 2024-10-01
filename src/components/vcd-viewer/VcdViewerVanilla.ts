import styles from './styles.module.scss'

import * as d3              from 'd3'

// models:
import {
    type VcdVariable,
    type Vcd,
    type VcdWave,
}                           from '@/models/vcd'

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



const xmlns = "http://www.w3.org/2000/svg";



enum SearchType {
    TIME,
    HEX,
}
export class VcdViewerVanilla {
    _cleanup : (() => void)|null
    
    
    
    // states:
    _vcd               : Vcd|null      = null;  
    _minTick           : number        = 0;
    _maxTick           : number        = 0;
    _allVcdVariables   : VcdVariable[] = [];
    
    _zoom              : number        = 1;
    _baseScale         : number        = 2 ** this._zoom;
    
    _mainSelection     : number|null   = null;
    _altSelection      : number|null   = null;
    
    _focusedVariable   : number|null   = null;
    _isBinarySelection : boolean       = (this._focusedVariable !== null) && (this._allVcdVariables?.[this._focusedVariable]?.size === 1);
    
    _selectionStart    : number|null   = null;
    _selectionEnd      : number|null   = null;
    
    _enableTouchScroll : boolean       = false;
    _touchStartRef     : number        = 0;
    
    _search            : string        = '';
    
    _searchType        : SearchType    = SearchType.HEX;
    
    _inputLogs         = {
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
    };
    
    
    
    // capabilities:
    _moveFromIndex     : number|null   = null;
    _moveToIndex       : number|null   = null;
    
    _movePosOriginRef  = { x: 0, y: 0 };
    _movePosRelative   = { x: 0, y: 0 };
    // #region pointerCapturable
    _pointerCapturable_isMouseActive          : boolean                         = false;
    _pointerCapturable_isTouchActive          : boolean                         = false;
    _pointerCapturable_lastPointerStatusEvent : MouseEvent|TouchEvent|undefined = undefined;
    
    _pointerCapturable_handlePointerStatus(event: MouseEvent|TouchEvent|undefined) {
        // updates:
        if (event) {
            this._pointerCapturable_lastPointerStatusEvent = event;
        }
        else {
            event = this._pointerCapturable_lastPointerStatusEvent;
        } // if
        
        
        
        // actions:
        if (
            (!this._pointerCapturable_isMouseActive && !this._pointerCapturable_isTouchActive) // both mouse & touch are inactive
            ||
            ( this._pointerCapturable_isMouseActive &&  this._pointerCapturable_isTouchActive) // both mouse & touch are active
        ) {
            if (this._watchGlobalMove(false) === false) { // unwatch global mouse/touch move
                if (this._onPointerCaptureEnd || this._onPointerCaptureCancel) {
                    const isCanceled = (
                        // !enabled // canceled by disabled
                        // ||
                        !event   // canceled by unknown event
                        ||
                        (
                            (
                                ((event as MouseEvent|null)?.buttons ?? 0)
                                +
                                ((event as TouchEvent|null)?.touches?.length ?? 0)
                            )
                            > 1  // canceled by pressed_mouse_nonprimary_button and/or multiple touched_screen
                        )
                    );
                    const mouseEvent : MouseEvent = (
                        (event && ('buttons' in event))
                        ? event
                        // simulates the Touch(Start|End|Cancel) as Mouse(Down|Up):
                        : new MouseEvent((event?.type === 'touchstart') ? 'mousedown' : 'mouseup', {
                            // simulates for `this._onPointerCaptureCancel(event)` & `this._onPointerCaptureEnd(event)`:
                            ...event,
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
                        })
                    );
                    if (isCanceled) {
                        this._onPointerCaptureCancel?.(mouseEvent);
                    }
                    else {
                        this._onPointerCaptureEnd?.(mouseEvent);
                    } // if
                } // if
            } // if
            
            
            
            this._pointerCapturable_lastPointerStatusEvent = undefined; // clear the last pointer status event
        } // if
    }
    _pointerCapturable_handleMouseStatusNative(event: MouseEvent) {
        // actions:
        this._pointerCapturable_isMouseActive = /* enabled && */ (
            (event.buttons === 1) // only left button pressed, ignore multi button pressed
        );
        this._pointerCapturable_handlePointerStatus(event); // update pointer status
    }
    _pointerCapturable_handleTouchStatusNative(event: TouchEvent) {
        // actions:
        this._pointerCapturable_isTouchActive = /* enabled && */ (
            (event.touches.length === 1) // only single touch
        );
        this._pointerCapturable_handlePointerStatus(event); // update pointer status
    }
    
    _pointerCapturable_handleMouseMoveNative(event: MouseEvent) {
        // conditions:
        // one of the mouse or touch is active but not both are active:
        if (
            (!this._pointerCapturable_isMouseActive && !this._pointerCapturable_isTouchActive) // both mouse & touch are inactive
            ||
            ( this._pointerCapturable_isMouseActive &&  this._pointerCapturable_isTouchActive) // both mouse & touch are active
        ) return;
        
        
        
        if (this._watchGlobalMove(true) === true){ // watch global mouse/touch move
            this._onPointerCaptureStart?.(event);
        } // if
        
        
        
        this._onPointerCaptureMove?.(event);
    }
    _pointerCapturable_handleTouchMoveNative(event: TouchEvent) {
        // conditions:
        if (event.touches.length !== 1) return; // only single touch
        
        
        
        // simulates the TouchMove as MouseMove:
        this._pointerCapturable_handleMouseMoveNative(new MouseEvent('mousemove', {
            // simulates for `onPointerCaptureStart(event)` & `onPointerCaptureMove(event)`:
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
                    
                    button  : 1, // primary button (usually the left button)
                    buttons : 1, // primary button (usually the left button)
                };
            })(),
        }));
    }
    
    _pointerCapturable_handleMouseSlide(event: MouseEvent) {
        // simulates the MouseDown as MouseMove (update the mouse position):
        this._pointerCapturable_handleMouseMoveNative(event);
    }
    _pointerCapturable_handleTouchSlide(event: TouchEvent) {
        // simulates the TouchStart as TouchMove (update the touch position):
        this._pointerCapturable_handleTouchMoveNative(event);
    }
    
    _pointerCapturable_handleMouseDown(event: MouseEvent) {
        this._pointerCapturable_handleMouseStatusNative(event); // update the mouse active status
        this._pointerCapturable_handleMouseSlide(event);  // update the mouse position
    }
    _pointerCapturable_handleTouchStart(event: TouchEvent) {
        this._pointerCapturable_handleTouchStatusNative(event); // update the touch active status
        this._pointerCapturable_handleTouchSlide(event);  // update the touch position
    }
    // #endregion pointerCapturable
    
    
    
    _onPointerCaptureStart(event: MouseEvent) {
        // updates:
        this._movePosOriginRef.x = event.screenX;
        this._movePosOriginRef.y = event.screenY;
        this._setMovePosRelative(this._movePosOriginRef);
    }
    _onPointerCaptureCancel(event: MouseEvent) {
        // cleanups:
        this._setMoveFromIndex(null);
        this._setMoveToIndex(null);
    }
    _onPointerCaptureEnd(event: MouseEvent) {
        this._handleApplyDrop();
        
        
        
        // cleanups:
        this._setMoveFromIndex(null);
        this._setMoveToIndex(null);
    }
    _onPointerCaptureMove(event: MouseEvent) {
        // updates:
        this._setMovePosRelative({
            x : (event.screenX - this._movePosOriginRef.x),
            y : (event.screenY - this._movePosOriginRef.y),
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
        if (newMoveToIndex !== undefined) this._handlePreviewMove(newMoveToIndex);
    }
    _handlePreviewMove(newMoveToIndex: number) {
        if (newMoveToIndex !== this._moveToIndex) this._moveToIndex = newMoveToIndex;
    }
    _handleApplyDrop() {
        // apply changes:
        if ((this._moveFromIndex !== null) && (this._moveToIndex !== null)) {
            this._allVcdVariables =
                moveVcdVariableData(this._allVcdVariables, this._moveFromIndex, this._moveToIndex);
        } // if
        
        
        
        // restore focus:
        if (this._focusedVariable !== null) {
            const focusMap = new Array<undefined|true>(this._allVcdVariables.length);
            focusMap[this._focusedVariable] = true;
            const newFocusMap = moveVcdVariableData(focusMap, this._moveFromIndex, this._moveToIndex);
            const newFocusedVariable = newFocusMap.findIndex((val) => (val === true))
            this._setFocusedVariable(newFocusedVariable);
        } // if
    }
    
    
    
    // refs:
    _labelsRef         : HTMLUListElement|null  = null;
    _bodyRef           : HTMLDivElement|null    = null;
    _rulerRef          : SVGGElement|null       = null;
    _variablesRef      : HTMLDivElement|null    = null;
    _resizeObserver    : ResizeObserver|null    = null;
    _btnPrevEdgeNeg    : HTMLButtonElement|null = null;
    _btnPrevEdgePos    : HTMLButtonElement|null = null;
    _btnNextEdgePos    : HTMLButtonElement|null = null;
    _btnNextEdgeNeg    : HTMLButtonElement|null = null;
    _btnPrevRef        : HTMLButtonElement|null = null;
    _btnTouchRef       : HTMLButtonElement|null = null;
    _btnSearchTimeRef  : HTMLButtonElement|null = null;
    _btnSearchHexRef   : HTMLButtonElement|null = null;
    _mainSelectionRef  : HTMLDivElement|null    = null;
    _altSelectionRef   : HTMLDivElement|null    = null;
    _rangeSelectionRef : HTMLDivElement|null    = null;
    
    
    
    // utilities:
    _isAltPressed() {
        return this._inputLogs.activeKeys.has('altleft') || this._inputLogs.activeKeys.has('altright');
    }
    
    
    
    // react:
    _moveableLabels    : HTMLElement[] = [];
    _moveableVariables : HTMLElement[] = [];
    
    
    
    // handlers:
    _handleResize({ '0': { borderBoxSize: { '0': { inlineSize } } }}: ResizeObserverEntry[]) {
        const extendSize = inlineSize / (this._maxTick * this._baseScale);
        // console.log({inlineSize, extendSize})
        const ruler = d3.scaleLinear([0, this._maxTick * extendSize], [0, this._maxTick * this._baseScale * extendSize]);
        d3.select(this._rulerRef).call(
            d3.axisTop(ruler).ticks(50) as any
        );
    }
    
    _handleKeyDown(event: KeyboardEvent) {
        // conditions:
        if ((event.target as Element)?.tagName === 'INPUT') return; // do not intercept <input>
        
        
        
        // conditions:
        /* note: the `code` may `undefined` on autoComplete */
        const keyCode = (event.code as string|undefined)?.toLowerCase();
        if (!keyCode) return; // ignores [unidentified] key
        
        
        
        // actions:
        if (!['tab'].includes(keyCode)) event.preventDefault();
        
        
        
        // logs:
        this._inputLogs.logKeyEvent(event, true /*key_down*/, actionKeys);
        if (this._watchGlobalKey(true) === true) {
            // console.log({activeKeys: inputLogs.activeKeys});
            // TODO: update keydown activated
        } // if
        
        
        
        // // actions:
        // if (this._inputLogs.isActive) {
        //     // trigger the onClick event later at `onKeyUp`
        //     this._inputLogs.performKeyUpActions = true;
        // }
    }
    
    _handleMouseDown(event: MouseEvent) {
        // actions:
        // event.preventDefault(); // do not preventing, causing the click_to_focus doesn't work
        
        
        
        // logs:
        this._inputLogs.logMouseEvent(event, true /*mouse_down*/, actionMouses);
        if (this._watchGlobalMouse(true) === true) {
            // console.log({activeKeys: this._inputLogs.activeKeys});
            this._handlePointerDown(event);
        } // if
    }
    _handleTouchStart(event: TouchEvent) {
        // actions:
        // event.preventDefault(); // do not preventing, causing the click_to_focus doesn't work
        
        
        
        // logs:
        this._inputLogs.logTouchEvent(event, true /*touch_down*/, actionTouches);
        if (this._watchGlobalTouch(true) === true) {
            // console.log({activeKeys: this._inputLogs.activeKeys});
            
            if (this._enableTouchScroll) {
                const touchX = (event.touches.length === 1 /* no multi touch for scrolling */) ? event.touches[0].clientX : undefined;
                if (touchX !== undefined) this._touchStartRef = touchX;
            }
            else {
                // simulates the Touch(Start|End|Cancel) as Mouse(Down|Up):
                this._handlePointerDown(
                    new MouseEvent((event?.type === 'touchstart') ? 'mousedown' : 'mouseup', {
                        // simulates for `onPointerCaptureCancel(event)` & `onPointerCaptureEnd(event)`:
                        ...event,
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
    }
    _handlePointerDown(event: MouseEvent) {
        // conditions:
        const variablesElm = this._variablesRef;
        if (!variablesElm) return;
        
        const bodyElm = this._bodyRef;
        if (!bodyElm) return;
        
        
        
        const { x } = variablesElm.getBoundingClientRect();
        const relativePosition = event.clientX - x;
        const valuePosition    = relativePosition / this._baseScale;
        
        
        
        this._setSelectionStart(valuePosition);
        this._setSelectionEnd(null);
    }
    
    _handleMouseMove(event: MouseEvent) {
        this._handlePointerMove(event);
    }
    _handleTouchMove(event: TouchEvent) {
        if (this._enableTouchScroll) {
            // conditions:
            const bodyElm = this._bodyRef;
            if (!bodyElm) return;
            
            
            
            // actions:
            const touchX = (event.touches.length === 1 /* no multi touch for scrolling */) ? event.touches[0].clientX : undefined;
            if (touchX !== undefined) {
                bodyElm.scrollLeft += (this._touchStartRef - touchX);
                this._touchStartRef = touchX; // restart the pos
            } // if
            
            
            
            return; // handled => done
        } // if
        
        
        
        // simulates the TouchMove as MouseMove:
        this._handlePointerMove(
            new MouseEvent('mousemove', {
                // simulates for `onPointerCaptureStart(event)` & `onPointerCaptureMove(event)`:
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
                        
                        button  : 1, // primary button (usually the left button)
                        buttons : 1, // primary button (usually the left button)
                    };
                })(),
            }),
        );
    }
    _handlePointerMove(event: MouseEvent) {
        // conditions:
        const variablesElm = this._variablesRef;
        if (!variablesElm) return;
        
        if (!this._inputLogs.isMouseActive && !this._inputLogs.isTouchActive) return; // no active pointer => ignore
        
        
        
        const { x } = variablesElm.getBoundingClientRect();
        const relativePosition = event.clientX - x;
        const valuePosition    = relativePosition / this._baseScale;
        
        
        
        if ((this._selectionStart === null) || Math.abs(valuePosition - this._selectionStart) < 2) return; // ignore very small selection
        this._setSelectionEnd(valuePosition);
    }
    _handlePointerUp(event: MouseEvent) {
        // conditions:
        if ((this._selectionStart === null) || (this._selectionEnd === null)) return; // no selectionRange => ignore
        
        const bodyElm = this._bodyRef;
        if (!bodyElm) return;
        
        
        
        const viewRange    = Math.abs(this._selectionStart - this._selectionEnd) * this._baseScale;
        const clientArea   = bodyElm.getBoundingClientRect().width;
        const targetScale  = clientArea / viewRange;
        const reZoom       = Math.log10(targetScale) / Math.log10(2);
        this._setZoom(this._zoom + reZoom);
        
        setTimeout(() => this._handleScrollToSelection(), 0); // scroll to the beginning of selection after the new zoom is completed:
    }
    _handleScrollToSelection() {
        // conditions:
        if ((this._selectionStart === null) || (this._selectionEnd === null)) return; // no selectionRange => ignore
        
        const bodyElm = this._bodyRef;
        if (!bodyElm) return;
        
        
        
        const scrollTo = (Math.min(this._selectionStart, this._selectionEnd) * this._baseScale);
        bodyElm.scrollLeft = scrollTo;
        
        this._setSelectionStart(null);
        this._setSelectionEnd(null);
    }
    
    _handleClick(event: MouseEvent) {
        // conditions:
        if ((this._selectionStart !== null) && (this._selectionEnd !== null)) return; // ignore if selectionRange is active
        
        const bodyElm = this._bodyRef;
        if (!bodyElm) return;
        
        
        
        const { x } = bodyElm.getBoundingClientRect();
        const relativePosition = event.clientX - x + bodyElm.scrollLeft;
        const valuePosition    = relativePosition / this._baseScale;
        
        
        
        if (this._isAltPressed()) {
            this._setAltSelection(valuePosition);
        }
        else {
            this._setMainSelection(valuePosition);
        } // if
    }
    
    _handleZoomOut() {
        this._setZoom(Math.round(this._zoom - 1));
    }
    _handleZoomIn() {
        this._setZoom(Math.round(this._zoom + 1));
    }
    
    _handleGotoEdge(gotoNext: boolean, predicate?: ((wave: VcdWave) => boolean), allVariables: boolean = false) {
        if (!allVariables && (this._focusedVariable === null)) return;
        const waves         = (
            (
                !allVariables
                ? this._allVcdVariables[this._focusedVariable ?? 0].waves
                : (
                    this._allVcdVariables
                    .flatMap(({ waves }) => waves)
                    .sort((a, b) => a.tick - b.tick)
                )
            )
            ??
            []
        );
        const isAlt         = !allVariables ? this._isAltPressed() : false;
        let   current       = isAlt ? this._altSelection : this._mainSelection;
        if (current === null) {
            if (!allVariables) return;
            current = this._minTick;
        } // if
        let   target        = waves[gotoNext ? 'find' : 'findLast']((wave) => (gotoNext ? (wave.tick > current) : (wave.tick < current)) && (!predicate || predicate(wave)));
        const dummyEdge     = {
            ...(gotoNext ? waves[waves.length - 1] : waves[0]),
            tick: gotoNext ? this._maxTick : this._minTick,
        } satisfies VcdWave;
        if ((target === undefined) && (!predicate || predicate(dummyEdge))) target = dummyEdge;
        if (target === undefined) return;
        const selectionPos = target.tick;
        (isAlt ? this._setAltSelection : this._setMainSelection).call(this, selectionPos);
        
        
        
        const bodyElm = this._bodyRef;
        if (!bodyElm) return;
        const scrollPosStart = bodyElm.scrollLeft / this._baseScale;
        const clientArea     = bodyElm.getBoundingClientRect().width;
        const scrollPosEnd   = scrollPosStart + (clientArea / this._baseScale);
        if ((selectionPos <= scrollPosStart) || (selectionPos >= scrollPosEnd)) { // if out of view
            bodyElm.scrollLeft = (selectionPos * this._baseScale) - (clientArea / 2);
        } // if
    }
    
    _handleGotoPrevEdgeNeg() {
        this._handleGotoEdge(false, (wave) => (wave.value === 0));
    }
    _handleGotoPrevEdgePos() {
        this._handleGotoEdge(false, (wave) => (wave.value === 1));
    }
    
    _handleGotoPrevSearch() {
        switch (this._searchType) {
            case SearchType.TIME :
                const searchNum = Number.parseFloat(this._search);
                if (isNaN(searchNum)) return;
                this._setMainSelection(searchNum);
                break;
            case SearchType.HEX  :
                this._handleGotoEdge(false, (wave) => (wave.value.toString(16).toLowerCase().includes(this._search.toLowerCase())), true);
                break;
        } // switch
    }
    _handleGotoNextSearch() {
        switch (this._searchType) {
            case SearchType.TIME :
                const searchNum = Number.parseFloat(this._search);
                if (isNaN(searchNum)) return;
                this._setMainSelection(searchNum);
                break;
            case SearchType.HEX  :
                this._handleGotoEdge(true, (wave) => (wave.value.toString(16).toLowerCase().includes(this._search.toLowerCase())), true);
                break;
        } // switch
    }
    
    _handleGotoPrevEdge() {
        this._handleGotoEdge(false);
    }
    _handleGotoNextEdge() {
        this._handleGotoEdge(true);
    }
    
    _handleGotoNextEdgeNeg() {
        this._handleGotoEdge(true, (wave) => (wave.value === 0));
    }
    _handleGotoNextEdgePos() {
        this._handleGotoEdge(true, (wave) => (wave.value === 1));
    }
    
    _handleToggleTouchScroll() {
        this._setEnableTouchScroll(!this._enableTouchScroll);
    }
    
    
    
    // global handlers:
    _watchGlobalKeyStatusRef   : undefined|(() => void) = undefined;
    _watchGlobalKey(active: boolean): boolean|null {
        // conditions:
        const shouldActive = active /* && enabled */;
        if (!!this._watchGlobalKeyStatusRef === shouldActive) return null; // already activated|deactivated => nothing to do
        
        
        
        // handlers:
        const handleKeyUp = (event: KeyboardEvent): void => {
            // conditions:
            /* note: the `code` may `undefined` on autoComplete */
            const keyCode = (event.code as string|undefined)?.toLowerCase();
            if (!keyCode) return; // ignores [unidentified] key
            
            
            
            // logs:
            this._inputLogs.logKeyEvent(event, false /*key_up*/, actionKeys);
            if (this._watchGlobalKey(false) === false) {
                console.log({activeKeys: this._inputLogs.activeKeys});
            //     // TODO: update keydown deactivated
            } // if
        };
        
        
        
        // actions:
        if (shouldActive) {
            window.addEventListener('keyup'   , handleKeyUp);
            
            
            
            // cleanups later:
            this._watchGlobalKeyStatusRef = () => {
                window.removeEventListener('keyup'   , handleKeyUp);
            };
        }
        else {
            // cleanups:
            this._watchGlobalKeyStatusRef?.();
            this._watchGlobalKeyStatusRef = undefined;
        } // if
        
        
        
        return shouldActive;
    }
    _watchGlobalMouseStatusRef : undefined|(() => void) = undefined;
    _watchGlobalMouse(active: boolean): boolean|null {
        // conditions:
        const shouldActive = active /* && enabled */;
        if (!!this._watchGlobalMouseStatusRef === shouldActive) return null; // already activated|deactivated => nothing to do
        
        
        
        // handlers:
        const handleMouseUp = (event: MouseEvent): void => {
            // logs:
            this._inputLogs.logMouseEvent(event, false /*mouse_up*/, actionMouses);
            if (this._watchGlobalMouse(false) === false) {
                // console.log({activeKeys: this._inputLogs.activeKeys});
                this._handlePointerUp(event);
            } // if
        };
        
        
        
        // actions:
        if (shouldActive) {
            window.addEventListener('mouseup' , handleMouseUp);
            
            
            
            // cleanups later:
            this._watchGlobalMouseStatusRef = () => {
                window.removeEventListener('mouseup' , handleMouseUp);
            };
        }
        else {
            // cleanups:
            this._watchGlobalMouseStatusRef?.();
            this._watchGlobalMouseStatusRef = undefined;
        } // if
        
        
        
        return shouldActive;
    }
    _watchGlobalTouchStatusRef : undefined|(() => void) = undefined;
    _watchGlobalTouch(active: boolean): boolean|null {
        // conditions:
        const shouldActive = active /* && enabled */;
        if (!!this._watchGlobalTouchStatusRef === shouldActive) return null; // already activated|deactivated => nothing to do
        
        
        
        // handlers:
        const handleTouchEnd = (event: TouchEvent): void => {
            // logs:
            this._inputLogs.logTouchEvent(event, false /*touch_up*/, actionTouches);
            if (this._watchGlobalTouch(false) === false) {
                // console.log({activeKeys: this._inputLogs.activeKeys});
                
                // simulates the TouchEnd as MouseUp:
                this._handlePointerUp(
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
            this._watchGlobalTouchStatusRef = () => {
                window.removeEventListener('touchend', handleTouchEnd);
            };
        }
        else {
            // cleanups:
            this._watchGlobalTouchStatusRef?.();
            this._watchGlobalTouchStatusRef = undefined;
        } // if
        
        
        
        return shouldActive;
    }
    _watchGlobalMoveStatusRef  : undefined|(() => void) = undefined;
    _watchGlobalMove(active: boolean) : boolean|null {
        // conditions:
        const shouldActive = active /* && enabled */; // control is disabled or readOnly => no response required
        if (!!this._watchGlobalMoveStatusRef === shouldActive) return null; // already activated|deactivated => nothing to do
        
        
        
        // actions:
        if (shouldActive) {
            // setups:
            const passiveOption : AddEventListenerOptions = { passive: true };
            
            const currentHandleMouseMoveNative   = (event: MouseEvent) => this._pointerCapturable_handleMouseMoveNative(event);
            const currentHandleTouchMoveNative   = (event: TouchEvent) => this._pointerCapturable_handleTouchMoveNative(event);
            const currentHandleMouseStatusNative = (event: MouseEvent) => this._pointerCapturable_handleMouseStatusNative(event);
            const currentHandleTouchStatusNative = (event: TouchEvent) => this._pointerCapturable_handleTouchStatusNative(event);
            
            window.addEventListener('mousemove'  , currentHandleMouseMoveNative   , passiveOption); // activating event
            window.addEventListener('touchmove'  , currentHandleTouchMoveNative   , passiveOption); // activating event
            
            window.addEventListener('mouseup'    , currentHandleMouseStatusNative , passiveOption); // deactivating event
            window.addEventListener('touchend'   , currentHandleTouchStatusNative , passiveOption); // deactivating event
            window.addEventListener('touchcancel', currentHandleTouchStatusNative , passiveOption); // deactivating event
            
            
            
            // cleanups later:
            this._watchGlobalMoveStatusRef = () => {
                window.removeEventListener('mousemove'  , currentHandleMouseMoveNative  ); // activating event
                window.removeEventListener('touchmove'  , currentHandleTouchMoveNative  ); // activating event
                
                window.removeEventListener('mouseup'    , currentHandleMouseStatusNative); // deactivating event
                window.removeEventListener('touchend'   , currentHandleTouchStatusNative); // deactivating event
                window.removeEventListener('touchcancel', currentHandleTouchStatusNative); // deactivating event
            };
        }
        else {
            // cleanups:
            this._watchGlobalMoveStatusRef?.();
            this._watchGlobalMoveStatusRef = undefined;
        } // if
        
        
        
        return shouldActive;
    }
    
    
    
    constructor(placeholder: Element) {
        const main = this._createMain();
        placeholder.appendChild(main);
        this._cleanup = () => {
            main.parentElement?.removeChild?.(main);
        };
        
        
        
        this._refreshState();
        this._refreshVcd();
    }
    _createMain() {
        const main = document.createElement('div');
        main.classList.add(styles.main);
        
        main.addEventListener('keydown', (event) => this._handleKeyDown(event));
        
        main.appendChild(this._createToolbar());
        main.appendChild(this._createBodyOuter());
        
        return main;
    }
    _createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.classList.add(styles.toolbar);
        
        toolbar.appendChild(this._createButton('zoom-out', { onClick: () => this._handleZoomOut() }));
        toolbar.appendChild(this._createButton('zoom-in' , { onClick: () => this._handleZoomIn()  }));
        
        this._btnPrevEdgeNeg = toolbar.appendChild(this._createButton('prev-neg-edge', { onClick: () => this._handleGotoPrevEdgeNeg() }));
        this._btnPrevEdgePos = toolbar.appendChild(this._createButton('prev-pos-edge', { onClick: () => this._handleGotoPrevEdgePos() }));
        
        toolbar.appendChild(this._createButton('prev-transition', { onClick: () => this._handleGotoPrevEdge() }));
        toolbar.appendChild(this._createButton('next-transition', { onClick: () => this._handleGotoNextEdge() }));
        
        this._btnNextEdgePos = toolbar.appendChild(this._createButton('next-neg-edge', { onClick: () => this._handleGotoNextEdgePos() }));
        this._btnNextEdgeNeg = toolbar.appendChild(this._createButton('next-pos-edge', { onClick: () => this._handleGotoNextEdgeNeg() }));
        
        toolbar.appendChild(this._createComboInput());
        
        this._btnPrevRef = toolbar.appendChild(this._createButton('prev', { onClick: () => this._handleGotoPrevSearch() }));
        toolbar.appendChild(this._createButton('next', { onClick: () => this._handleGotoNextSearch() }));
        
        this._btnTouchRef = toolbar.appendChild(this._createButton('touch', { onClick: () => this._handleToggleTouchScroll() }));
        
        return toolbar;
    }
    _createButton(className: string, props?: { onClick?: () => void, text?: string }) {
        const {
            onClick,
            text,
        } = props ?? {};
        const button = document.createElement('button');
        button.type = 'button';
        button.classList.add(className);
        if (onClick) button.addEventListener('click', onClick);
        if (text) button.append(text);
        return button;
    }
    _createComboInput() {
        const combo = document.createElement('div');
        combo.classList.add(styles.comboInput);
        combo.appendChild(this._createSearchInput()).addEventListener('change', (event) => { this._search = (event.currentTarget as HTMLInputElement).value });
        this._btnSearchTimeRef = combo.appendChild(this._createButton('text', { text: 't=' , onClick: () => this._setSearchType(SearchType.TIME) }));
        this._btnSearchHexRef  = combo.appendChild(this._createButton('text', { text: 'hex', onClick: () => this._setSearchType(SearchType.HEX ) }));
        return combo;
    }
    _createSearchInput() {
        const input = document.createElement('input');
        input.type = 'search';
        input.placeholder = 'Search';
        return input;
    }
    _createBodyOuter() {
        const bodyOuter = document.createElement('div');
        bodyOuter.classList.add(styles.bodyOuter);
        bodyOuter.appendChild(this._createLabels());
        bodyOuter.appendChild(this._createBody());
        return bodyOuter;
    }
    _createLabels() {
        const labels = document.createElement('ul');
        labels.classList.add(styles.labels);
        
        labels.addEventListener('mousedown' , (event) => this._pointerCapturable_handleMouseDown(event));
        labels.addEventListener('touchstart', (event) => this._pointerCapturable_handleTouchStart(event));
        
        this._labelsRef = labels;
        return labels;
    }
    _createBody() {
        const body = document.createElement('div');
        body.classList.add(styles.body);
        body.appendChild(this._createRuler());
        body.appendChild(this._createVariables());
        
        // conditional render:
        this._mainSelectionRef  = this._createMainSelection();
        this._altSelectionRef   = this._createAltSelection();
        this._rangeSelectionRef = this._createRangeSelection();
        
        this._bodyRef = body;
        return body;
    }
    _createRuler() {
        const svg = document.createElementNS(xmlns, 'svg');
        svg.classList.add(styles.ruler);
        
        const ruler = document.createElementNS(xmlns, 'g');
        ruler.setAttribute('transform', 'translate(0, 20)');
        this._rulerRef = ruler;
        
        svg.append(
            ruler
        );
        
        const resizeObserver = new ResizeObserver((entries) => this._handleResize(entries));
        resizeObserver.observe(svg, { box: 'border-box' });
        this._resizeObserver = resizeObserver;
        
        return svg;
    }
    _createVariables() {
        const variables = document.createElement('div');
        variables.classList.add(styles.variables);
        
        variables.addEventListener('click', (event) => this._handleClick(event));
        
        variables.addEventListener('mousedown', (event) => this._handleMouseDown(event));
        variables.addEventListener('touchstart', (event) => this._handleTouchStart(event));
        
        variables.addEventListener('mousemove', (event) => this._handleMouseMove(event));
        variables.addEventListener('touchmove', (event) => this._handleTouchMove(event));
        
        this._variablesRef = variables;
        
        return variables;
    }
    _createMainSelection() {
        const mainSelection = document.createElement('div');
        mainSelection.classList.add(styles.selection);
        mainSelection.classList.add('main');
        return mainSelection;
    }
    _createAltSelection() {
        const altSelection = document.createElement('div');
        altSelection.classList.add(styles.selection);
        altSelection.classList.add('alt');
        return altSelection;
    }
    _createRangeSelection() {
        const rangeSelection = document.createElement('div');
        rangeSelection.classList.add(styles.selectionRange);
        return rangeSelection;
    }
    destroy() {
        this._cleanup?.();
        this._cleanup = null;
        
        this._resizeObserver?.disconnect();
        this._resizeObserver = null;
    }
    
    
    
    _reactListItem(index: number, variable: VcdVariable) {
        const listItem = document.createElement('span');
        listItem.classList.add(styles.label);
        const classState = ((this._moveFromIndex !== null) ? ((this._moveFromIndex === index) ? 'dragging' : 'dropZone') : null);
        if (classState) listItem.classList.add(classState);
        
        const style = listItem.style;
        if (this._moveFromIndex === index) {
            style.setProperty('--posX'        , `${this._movePosRelative.x}`             );
            style.setProperty('--posY'        , `${this._movePosRelative.y}`             );
            style.setProperty('--moveRelative', `${(this._moveToIndex ?? index) - index}`);
        }
        else {
            style.setProperty('--posX'        , null);
            style.setProperty('--posY'        , null);
            style.setProperty('--moveRelative', null);
        } // if
        
        listItem.appendChild(this._reactListItemLabel(index));
        listItem.appendChild(this._reactListItemValue(variable));
        
        return listItem;
    }
    _reactListItemLabel(index: number) {
        const label = document.createElement('span');
        label.classList.add(styles.labelItemHandler);
        label.addEventListener('pointerdown', () => this._moveFromIndex = index);
        return label;
    }
    _reactListItemValue(variable: VcdVariable) {
        const label = document.createElement('span');
        if (this._vcd) label.append(
            `${getModulesOfVariable(this._vcd, variable)?.slice(1).map(({name}) => name).join('.')}.${variable.name}`
        )
        return label;
    }
    _reactCrateLabelWrapper(index: number, movedLabel: HTMLElement) {
        const wrapper = document.createElement('li');
        wrapper.classList.add(styles.labelWrapper);
        wrapper.dataset.droppable = `${index}`;
        wrapper.appendChild(movedLabel);
        return wrapper;
    }
    _reactCrateScrollbarHack() {
        const hack = document.createElement('li');
        hack.classList.add(styles.scrollbarHack);
        return hack;
    }
    
    _reactVariableItem(index: number, variable: VcdVariable) {
        const variableItem = document.createElement('div');
        variableItem.classList.add(styles.variable);
        const classFocusState = ((this._focusedVariable === index) ? 'focus' : null);
        const classDragState  = (((this._moveFromIndex !== null) && (this._moveFromIndex === index)) ? 'dragging' : null);
        if (classFocusState) variableItem.classList.add(classFocusState);
        if (classDragState ) variableItem.classList.add(classDragState );
        
        const style = variableItem.style;
        if (this._moveFromIndex === index) {
            style.setProperty('--posX'        , `${this._movePosRelative.x}`             );
            style.setProperty('--posY'        , `${this._movePosRelative.y}`             );
            style.setProperty('--moveRelative', `${(this._moveToIndex ?? index) - index}`);
        }
        else {
            style.setProperty('--posX'        , null);
            style.setProperty('--posY'        , null);
            style.setProperty('--moveRelative', null);
        } // if
        
        variableItem.tabIndex = 0;
        variableItem.addEventListener('focus', () => {
            this._setFocusedVariable(index);
        });
        
        variableItem.append(
            ...[
                this._reactVariableWaves(variable),
                this._reactVariableWaveLast(variable),
            ].filter((child): child is Exclude<typeof child, null> => (child !== null))
        );
        
        return variableItem;
    }
    _reactVariableWaves(variable: VcdVariable) {
        const wavesElm = document.createElement('div');
        wavesElm.classList.add(styles.waves);
        
        wavesElm.append(
            ...
            variable.waves.map((wave, index) =>
                this._reactVariableWave(index, variable, wave)
            )
            .filter((wave): wave is Exclude<typeof wave, null> => (wave !== null))
        );
        
        return wavesElm;
    }
    _reactVariableWave(index: number, {waves, size}: VcdVariable, {tick, value}: VcdWave) {
        const nextTick : number = (waves.length && ((index + 1) < waves.length)) ? waves[index + 1].tick : this._maxTick;
        // if (nextTick === maxTick) return null;
        const isError  = (typeof(value) === 'string') /* || ((lsb !== undefined) && (value < lsb)) || ((msb !== undefined) && (value > msb)) */;
        const isBinary = (size === 1);
        
        
        
        const length = (nextTick - tick) * this._baseScale;
        if (length === 0) return null;
        
        
        
        const wave = document.createElement('span');
        const classErrorState = isError ? 'error' : null;
        const classBinaryState = isBinary ? ['bin', value ? 'hi':'lo'] : null;
        if (classErrorState ) wave.classList.add(classErrorState );
        if (classBinaryState) wave.classList.add(...classBinaryState);
        wave.style.setProperty('--length', `${length}`);
        
        if (!isBinary) wave.append(
            `${((typeof(value) === 'string') ? value : value.toString(16))}`
        );
        
        return wave;
    }
    _reactVariableWaveLast({waves, size}: VcdVariable) {
        const lastWave = waves.length ? waves[waves.length - 1] : undefined;
        if (lastWave === undefined) return null; // if the last wave doesn't exist => do not render
        const {
            value,
        } = lastWave;
        
        const isError  = (typeof(value) === 'string') /* || ((lsb !== undefined) && (value < lsb)) || ((msb !== undefined) && (value > msb)) */;
        const isBinary = (size === 1);
        
        
        
        const wave = document.createElement('span');
        wave.classList.add(styles.lastWave);
        wave.classList.add('last');
        const classErrorState = isError ? 'error' : null;
        const classBinaryState = isBinary ? ['bin', value ? 'hi':'lo'] : null;
        if (classErrorState ) wave.classList.add(classErrorState );
        if (classBinaryState) wave.classList.add(...classBinaryState);
        
        if (!isBinary) wave.append(
            `${((typeof(value) === 'string') ? value : value.toString(16))}`
        );
        
        return wave;
    }
    _reactCrateVariableWrapper(movedVariable: HTMLElement) {
        const wrapper = document.createElement('div');
        wrapper.classList.add(styles.variableWrapper);
        wrapper.appendChild(movedVariable);
        return wrapper;
    }
    
    _refreshVcd() {
        this._isBinarySelection = (this._focusedVariable !== null) && (this._allVcdVariables?.[this._focusedVariable]?.size === 1);
        
        this._moveableLabels = (
            this._vcd
            ? this._allVcdVariables.map((variable, index) =>
                this._reactListItem(index, variable)
            )
            : []
        );
        
        this._labelsRef?.replaceChildren();
        this._labelsRef?.append(
            ...
            moveVcdVariableData(this._moveableLabels, this._moveFromIndex, this._moveToIndex)
            .map((movedLabel, index) =>
                this._reactCrateLabelWrapper(index, movedLabel)
            ),
            this._reactCrateScrollbarHack(),
        );
        
        
        
        this._moveableVariables = (
            this._vcd
            ? this._allVcdVariables.map((variable, index) =>
                this._reactVariableItem(index, variable)
            )
            : []
        );
        
        this._variablesRef?.replaceChildren();
        this._variablesRef?.append(
            ...
            moveVcdVariableData(this._moveableVariables, this._moveFromIndex, this._moveToIndex)
            .map((movedVariable, index) =>
                this._reactCrateVariableWrapper(movedVariable)
            )
        );
    }
    _refreshState() {
        this._btnTouchRef?.classList[this._enableTouchScroll ? 'add' : 'remove']('active');
        this._btnSearchTimeRef?.classList[(this._searchType === SearchType.TIME) ? 'add' : 'remove']('active');
        this._btnSearchHexRef?.classList[(this._searchType === SearchType.HEX) ? 'add' : 'remove']('active');
        if (this._btnPrevEdgeNeg) this._btnPrevEdgeNeg.disabled = !this._isBinarySelection;
        if (this._btnPrevEdgePos) this._btnPrevEdgePos.disabled = !this._isBinarySelection;
        if (this._btnNextEdgePos) this._btnNextEdgePos.disabled = !this._isBinarySelection;
        if (this._btnNextEdgeNeg) this._btnNextEdgeNeg.disabled = !this._isBinarySelection;
        if (this._btnPrevRef    ) this._btnPrevRef.disabled = (this._searchType !== SearchType.HEX);
        
        if ((this._mainSelection  !== null) && (this._mainSelectionRef)) {
            this._mainSelectionRef.style.setProperty('--position', `${this._mainSelection * this._baseScale}`);
            
            this._bodyRef?.appendChild(this._mainSelectionRef);
        }
        else {
            this._mainSelectionRef?.parentElement?.removeChild(this._mainSelectionRef);
        } // if
        
        if ((this._altSelection   !== null) && (this._altSelectionRef)) {
            this._altSelectionRef.style.setProperty('--position', `${this._altSelection * this._baseScale}`);
            
            this._bodyRef?.appendChild(this._altSelectionRef);
        }
        else {
            this._altSelectionRef?.parentElement?.removeChild(this._altSelectionRef);
        } // if
        
        if ((this._selectionStart !== null) && (this._selectionEnd !== null) && (this._rangeSelectionRef)) {
            this._rangeSelectionRef.style.setProperty('--selStart', `${Math.min(this._selectionStart, this._selectionEnd)  * this._baseScale}`);
            this._rangeSelectionRef.style.setProperty('--selEnd', `${Math.max(this._selectionStart, this._selectionEnd) * this._baseScale}`);
            
            this._bodyRef?.appendChild(this._rangeSelectionRef);
        }
        else {
            this._rangeSelectionRef?.parentElement?.removeChild(this._rangeSelectionRef);
        } // if
    }
    
    
    
    getVcd() {
        return this._vcd;
    }
    setVcd(vcd: Vcd|null) {
        this._vcd             =  vcd;
        this._minTick         = !vcd ? 0 : getVariableMinTick(vcd.rootModule);
        this._maxTick         = !vcd ? 0 : getVariableMaxTick(vcd.rootModule);
        this._allVcdVariables =  vcd ? flatMapVariables(vcd.rootModule) : [];
        
        this._refreshState();
        this._refreshVcd();
        if (this._rulerRef) {
            const inlineSize = Number.parseFloat(getComputedStyle(this._rulerRef).inlineSize);
            if (!isNaN(inlineSize)) {
                this._handleResize([{
                    borderBoxSize: [{
                        inlineSize,
                        blockSize  : undefined as any,
                    }],
                    contentBoxSize            : undefined as any,
                    devicePixelContentBoxSize : undefined as any,
                    contentRect               : undefined as any,
                    target                    : undefined as any,
                }]);
            } // if
        } // if
    }
    _getZoom() {
        return this._zoom;
    }
    _setZoom(zoom: number) {
        this._zoom      = zoom;
        this._baseScale = 2 ** zoom;
        
        this._refreshState();
        this._refreshVcd();
    }
    _setMainSelection(mainSelection: number|null) {
        this._mainSelection = mainSelection;
        this._refreshState();
    }
    _setAltSelection(altSelection: number|null) {
        this._altSelection = altSelection;
        this._refreshState();
    }
    _setSelectionStart(selectionStart: number|null) {
        this._selectionStart = selectionStart;
        this._refreshState();
    }
    _setSelectionEnd(selectionEnd: number|null) {
        this._selectionEnd = selectionEnd;
        this._refreshState();
    }
    _setFocusedVariable(focusedVariable: number) {
        this._focusedVariable = focusedVariable;
        this._refreshState();
        // TODO: apply|remove .focus class without calling `_refreshVcd()` to avoid onFocus() onClick() issue
    }
    _setEnableTouchScroll(enableTouchScroll: boolean) {
        this._enableTouchScroll = enableTouchScroll;
        this._refreshState();
    }
    _setSearchType(searchType: SearchType) {
        this._searchType = searchType;
        this._refreshState();
    }
    _setMovePosRelative(movePosRelative: typeof this._movePosRelative) {
        this._movePosRelative = movePosRelative;
        
        this._refreshState();
        this._refreshVcd();
    }
    _setMoveFromIndex(moveFromIndex: typeof this._moveFromIndex) {
        this._moveFromIndex = moveFromIndex;
        
        this._refreshState();
        this._refreshVcd();
    }
    _setMoveToIndex(moveToIndex: typeof this._moveToIndex) {
        this._moveToIndex = moveToIndex;
        
        this._refreshState();
        this._refreshVcd();
    }
}
