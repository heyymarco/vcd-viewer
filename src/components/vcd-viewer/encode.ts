// models:
import {
    type Vcd,
    type VcdModule,
    type VcdVariable,
    type VcdToken,
    
    VcdValueFormat,
    vcdValueToString,
    
    defaultColorOptions,
    vcdTimescaleToString,
    vcdFormatToRadix,
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



const writeModule = (lines: string[], module: VcdModule) => {
    for (const { type , size, alias, name, msb, lsb } of module.variables) {
        if (size === 1) {
            lines.push(`$var ${type} ${size} ${alias} ${name} $end`);
        }
        else {
            lines.push(`$var ${type} ${size} ${alias} ${name} [${msb}:${lsb}] $end`);
        } // if
    } // for
    
    for (const subModule of module.submodules) {
        lines.push(`$scope module ${subModule.name} $end`);
        writeModule(lines, subModule);
        lines.push('$upscope $end');
    } // for
};
export const encodeVcdToFileContent = (vcd: Vcd|null): string|null => {
    if (vcd === null) return null;
    
    
    
    const lines : string[] = [];
    
    
    
    const date = vcd.date;
    if (date) {
        lines.push('$date');
        lines.push(`\t${date.toISOString()}`)
        lines.push('$end');
    } // if
    const version = vcd.version;
    
    
    
    if (version) {
        lines.push('$version');
        lines.push(`\t${version}`)
        lines.push('$end');
    } // if
    
    
    
    const timescale = vcd.timescale;
    lines.push('$timescale');
    lines.push(`\t${vcdTimescaleToString(timescale)}`)
    lines.push('$end');
    
    
    
    writeModule(lines, vcd.rootModule);
    
    
    
    lines.push('$enddefinitions $end');
    
    
    
    const minTick = getVariableMinTick(vcd.rootModule);
    lines.push(`#${minTick}`);
    
    
    
    const variables = flatMapVariables(vcd.rootModule);
    lines.push('$dumpvars');
    
    const values = new Set<string>();
    for (const {alias, size, waves: {'0': {value}}} of variables.filter(({waves}) => waves[0]?.tick === minTick)) {
        if (typeof(value) === 'string') {
            values.add(`${value} ${alias}`);
        }
        else if (size === 1) {
            values.add(`${value}${alias}`);
        }
        else {
            values.add(`${`b${value.toString(2)}`} ${alias}`);
        } // if
    } // for
    lines.push(...values); values.clear();
    lines.push('$end');
    
    
    
    const ticks = new Set<number>(
        variables.flatMap(({waves}) => waves.map(({tick}) => tick))
    );
    ticks.delete(minTick);
    
    
    
    for (const currentTick of Array.from(ticks).toSorted((a, b) => (a - b))) {
        lines.push(`#${currentTick}`);
        
        for (const {alias, size, value} of variables.map(({alias, size, waves}) => ({
            alias,
            size,
            value: waves.find(({tick}) => (tick === currentTick))?.value,
        })).filter((item): item is typeof item & { value: string|number } => (item.value !== undefined))) {
            if (typeof(value) === 'string') {
                values.add(`${value} ${alias}`);
            }
            else if (size === 1) {
                values.add(`${value}${alias}`);
            }
            else {
                values.add(`${`b${value.toString(2)}`} ${alias}`);
            } // if
        } // for
        lines.push(...values); values.clear();
    } // for
    
    
    
    return lines.join('\r\n');
}

