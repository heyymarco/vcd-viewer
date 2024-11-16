import {
    type VcdWave,
    Vcd,
    VcdMask,
    VcdModule,
    VcdVariable,
    VcdValueFormat,
}                           from './types'
import  Color               from 'color'
import {
    timescaleOptions,
} from '@/components/editors/TimescaleEditor';
import {
    produce,
}                           from 'immer'



export const flatMapVariables = (module: VcdModule): VcdVariable[] => {
    return [
        ...module.variables,
        ...module.submodules.flatMap(flatMapVariables),
    ];
}
export const getVariableMinTick = (module: VcdModule): number => {
    return Math.min(
        ...flatMapVariables(module)
        .map(({ waves }) => vcdEnumerateWaves<never>(waves)[0]?.tick ?? undefined)
        .filter((tick): tick is Exclude<typeof tick, undefined> => (tick !== undefined))
    );
}
export const getVariableMaxTick = (module: VcdModule): number => {
    return Math.max(
        ...flatMapVariables(module)
        .map(({ waves }) => vcdEnumerateWaves<never>(waves)[waves.length - 1]?.tick)
        .filter((tick): tick is Exclude<typeof tick, undefined> => (tick !== undefined))
    );
}
export const compareVcdVariables = (a: VcdVariable, b: VcdVariable): number => {
    const { sort: sortA } = a;
    const { sort: sortB } = b;
    if ((sortA === undefined) && (sortB === undefined)) return 0;
    if (sortA === undefined) return -1; // a is nothing => b wins
    if (sortB === undefined) return +1; // b is nothing => a wins
    return sortA - sortB;
}



export const getModulesOfVariable = (vcd: Vcd, variable: VcdVariable): VcdModule[]|null => {
    return getRecursiveModulesOfVariable([], vcd.rootModule, variable);
}
const getRecursiveModulesOfVariable = (parentModules: VcdModule[], currentModule: VcdModule, variable: VcdVariable): VcdModule[]|null => {
    if (currentModule.variables.some((searchVariable): boolean => {
        if (searchVariable === variable) return true;
        if (searchVariable.id === variable.id) return true;
        return false;
    })) return [...parentModules, currentModule];
    for (const subModule of currentModule.submodules) {
        const found = getRecursiveModulesOfVariable([...parentModules, currentModule], subModule, variable);
        if (found) return found;
    } // for
    return null
}



export const vcdValueToString = (value: VcdWave['value'], format: VcdValueFormat): string => {
    switch (format) {
        case VcdValueFormat.BINARY      : return value.toString(2);
        case VcdValueFormat.DECIMAL     : return value.toString(10);
        case VcdValueFormat.HEXADECIMAL : return value.toString(16);
        default:                          return value.toString();
    } // switch
}

export const vcdTimescaleToString = (timescale: number): string => {
    for (const { unit, magnitudo } of timescaleOptions.toReversed()) {
        if (timescale < ((0.1 ** magnitudo) * 999.999)) return `${(timescale * (10 ** magnitudo)).toFixed(0)}${unit}`;
    } // for
    return `${timescale.toFixed(0)}s`;
}
export const vcdDurationOfTimescaleToString = (duration: number, timescale: number): string => {
    for (const { unit, magnitudo } of timescaleOptions.toReversed()) {
        if (timescale < ((0.1 ** magnitudo) * 999.999)) return `${duration.toFixed(0)}${unit}`;
    } // for
    return `${duration.toFixed(0)}s`;
}



export const vcdFormatToRadix = (format: VcdValueFormat): number => {
    switch (format) {
        case VcdValueFormat.BINARY      : return 2;
        case VcdValueFormat.DECIMAL     : return 10;
        case VcdValueFormat.HEXADECIMAL : return 16;
        default : throw Error('app error');
    } // switch
}



const recursiveFilterMask = (masks: VcdMask[], vcd: Vcd, parentModule: VcdModule): VcdModule => {
    parentModule.variables = (
        masks
        .map((mask): VcdVariable|undefined => {
            return parentModule.variables.find((variable) => {
                const fullName = `${getModulesOfVariable(vcd, variable)?.slice(1).map(({name}) => name).join('.')}.${variable.name}`;
                if (fullName !== mask.name) return false;
                
                
                
                // set color:
                const color = mask.color;
                if (color !== undefined) {
                    variable.color = color;
                } // if
                
                
                
                // truncate excess variable waves:
                const maxTime = mask.maxTime;
                if (maxTime !== undefined) {
                    const waves = vcdEnumerateWaves<never>(variable.waves);
                    const excessWaveIndex = waves.findIndex(({tick}) => ((tick * vcd.timescale) > (maxTime * (mask.timescale ?? vcd.timescale))));
                    if (excessWaveIndex >= 0) waves.splice(excessWaveIndex);
                } // if
                
                
                
                return true;
            })
        })
        .filter((variable): variable is Exclude<typeof variable, undefined> => (variable !== undefined))
        
    );
    parentModule.submodules = (
        parentModule.submodules
        .map((submodule) => recursiveFilterMask(masks, vcd, submodule))
        .filter((submodule): submodule is Exclude<typeof submodule, undefined> => (submodule !== undefined))
    );
    return parentModule;
}
export const vcdApplyMask = <TNull extends undefined|null = never>(masks: VcdMask[]|undefined, vcd: Vcd|TNull): Vcd|TNull => {
    if (!vcd) return vcd;
    if (!masks?.length) return vcd;
    
    
    
    return produce(vcd, (vcd) => {
        vcd.rootModule.submodules = (
            vcd.rootModule.submodules
            .map((submodule) => recursiveFilterMask(masks, vcd, submodule))
            .filter((submodule): submodule is Exclude<typeof submodule, undefined> => (submodule !== undefined))
        );
    });
}


export const vcdEnumerateWaves = <TNull extends undefined|null = never>(waves: VcdWave[]|(() => VcdWave[])|TNull): VcdWave[]|TNull => {
    if (!waves) return waves;
    if (typeof(waves) === 'function') return waves();
    return waves;
}



export const defaultColorOptions : Color[] = [
    Color('#B5CEA8'),
    Color('#FF0101'),
    Color('#CC01AF'),
    Color('#BA01FF'),
    Color('#7409A5'),
    Color('#0101FF'),
    Color('#01AEAE'),
    Color('#017A01'),
    Color('#01FF01'),
    Color('#FFFF01'),
    Color('#FEB301'),
    Color('#FF4701'),
];
