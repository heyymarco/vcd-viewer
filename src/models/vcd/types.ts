import type Color           from 'color'



export interface Vcd {
    date      ?: Date
    version   ?: string
    
    timescale  : number
    rootModule : VcdModule
}

export interface VcdModule {
    name       : string
    submodules : VcdModule[]
    
    variables  : VcdVariable[]
}

export interface VcdVariable {
    name       : string
    alias      : string
    
    type       : string
    size       : number
    msb        : number|undefined
    lsb        : number|undefined
    waves      : VcdWave[] | (() => VcdWave[])
    
    // extra data:
    id         : number
    format     : VcdValueFormat
    color      : Color|null
}
export interface VcdVariableStatic
    extends
        VcdVariable
{
    waves      : VcdWave[]
}

export enum VcdValueFormat {
    BINARY,
    DECIMAL,
    HEXADECIMAL,
}

export interface VcdWave {
    tick       : number
    value      : number|string
}

export interface VcdWaveExtended extends VcdWave {
    lastTick   : number
    prevValue  : number|string | undefined
    nextValue  : number|string | undefined
}



export interface VcdMask {
    name       : string
    color     ?: Color|null
    
    /**
     * The timescale of the `maxTime`.  
     * If ommited (`undefined`), the timescale of the vcd file will be used.
     */
    timescale ?: number
    maxTime   ?: number
}



export interface VcdClockGuide
    extends
        Pick<VcdVariable,
            |'name'
            |'alias'
        >,
        Partial<Pick<VcdVariable,
            |'type'
            |'color'
        >>
{
    /**
     * The timescale of the `maxTime`.  
     * If ommited (`undefined`), the timescale of the vcd_file will be used.
     */
    timescale     ?: number
    
    /**
     * The starting time of the clock.  
     * If ommited (`undefined`), defaults to `0`.
     */
    minTime       ?: number
    
    /**
     * The starting time of the clock.  
     * If ommited (`undefined`), defaults to vcd_file's duration.
     */
    maxTime       ?: number
    
    startingValue  : boolean
    flipInterval   : number
}



export type VcdToken =
    |'DATE'
    |'VERSION'
    |'TIMESCALE'
    |'MODULE'
    |'DUMPVARS'