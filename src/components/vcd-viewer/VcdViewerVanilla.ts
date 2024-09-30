import styles from './styles.module.scss'
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
            this._focusedVariable = newFocusedVariable;
        } // if
    }
    
    
    
    // refs:
    _labelsRef    : HTMLUListElement|null = null;
    _svgRef       : SVGSVGElement|null    = null;
    _bodyRef      : HTMLDivElement|null   = null;
    _rulerRef     : SVGGElement|null      = null;
    _variablesRef : HTMLDivElement|null   = null;
    
    
    
    // utilities:
    _isAltPressed() {
        return this._inputLogs.activeKeys.has('altleft') || this._inputLogs.activeKeys.has('altright');
    }
    
    
    
    // react:
    _moveableLabels    : HTMLElement[] = [];
    _moveableVariables : HTMLElement[] = [];
    
    
    
    // handlers:
    
    
    
    constructor(placeholder: Element) {
        const main = this._createMain();
        placeholder.appendChild(main);
        this._cleanup = () => {
            main.parentElement?.removeChild?.(main);
        };
        
        
        
        this._react();
    }
    _createMain() {
        const main = document.createElement('div');
        main.classList.add(styles.main);
        main.appendChild(this._createToolbar());
        main.appendChild(this._createBodyOuter());
        return main;
    }
    _createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.classList.add(styles.toolbar);
        
        toolbar.appendChild(this._createButton('zoom-out'));
        toolbar.appendChild(this._createButton('zoom-in'));
        
        toolbar.appendChild(this._createButton('prev-neg-edge'));
        toolbar.appendChild(this._createButton('prev-pos-edge'));
        
        toolbar.appendChild(this._createButton('prev-transition'));
        toolbar.appendChild(this._createButton('next-transition'));
        
        toolbar.appendChild(this._createButton('next-neg-edge'));
        toolbar.appendChild(this._createButton('next-pos-edge'));
        
        toolbar.appendChild(this._createComboInput());
        
        toolbar.appendChild(this._createButton('prev'));
        toolbar.appendChild(this._createButton('next'));
        
        toolbar.appendChild(this._createButton('touch'));
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
        combo.appendChild(this._createSearchInput());
        combo.appendChild(this._createButton('text', { text: 't=' }));
        combo.appendChild(this._createButton('text', { text: 'hex' }));
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
        this._labelsRef = labels;
        return labels;
    }
    _createBody() {
        const body = document.createElement('div');
        body.classList.add(styles.body);
        body.appendChild(this._createRuler());
        body.appendChild(this._createVariables());
        body.appendChild(this._createMainSelection());
        body.appendChild(this._createAltSelection());
        body.appendChild(this._createRangeSelection());
        return body;
    }
    _createRuler() {
        const svg = document.createElementNS(xmlns, 'svg');
        svg.classList.add(styles.ruler);
        return svg;
    }
    _createVariables() {
        const variables = document.createElement('div');
        variables.classList.add(styles.variables);
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
            this._focusedVariable = index;
            this._react();
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
        const wrapper = document.createElement('li');
        wrapper.classList.add(styles.variableWrapper);
        wrapper.appendChild(movedVariable);
        return wrapper;
    }
    
    _react() {
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
            )
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
    
    
    
    getVcd() {
        return this._vcd;
    }
    setVcd(vcd: Vcd|null) {
        this._vcd             =  vcd;
        this._minTick         = !vcd ? 0 : getVariableMinTick(vcd.rootModule);
        this._maxTick         = !vcd ? 0 : getVariableMaxTick(vcd.rootModule);
        this._allVcdVariables =  vcd ? flatMapVariables(vcd.rootModule) : [];
        
        this._react();
    }
    _getZoom() {
        return this._zoom;
    }
    _setZoom(zoom: number) {
        this._zoom      = zoom;
        this._baseScale = 2 ** zoom;
    }
}
