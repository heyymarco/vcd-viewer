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
}                           from 'react'
import cn                   from 'classnames'
import * as d3              from 'd3'

// models:
import {
    type Vcd,
}                           from '@/models/vcd'

// utilities:
import {
    flatMapSignals,
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
    
    
    
    // refs:
    const rulerRef = useRef<SVGGElement|null>(null);
    
    
    
    // effects:
    useEffect(() => {
        const ruler = d3.scaleLinear([0, 5], [0, 1000]);
        d3.select(rulerRef.current).call(
            d3.axisTop(ruler) as any
        );
    }, []);
    
    
    
    // default props:
    const {
        // TODO
        
        
        
        // other props:
        ...restIndicatorProps
    } = restVcdViewerProps;
    
    
    
    // jsx:
    return (
        <div
            // other props:
            {...restIndicatorProps}
            
            
            
            // classes:
            className={cn(props.className, styles.main)}
        >
            <svg className={styles.ruler}>
                <g ref={rulerRef} transform='translate(0, 20)' />
            </svg>
            {!!vcd && flatMapSignals(vcd.rootModule).map((signal) =>
                <div className={styles.signal}>
                    {signal.name}
                </div>
            )}
        </div>
    );
};
export {
    VcdViewer,            // named export for readibility
    VcdViewer as default, // default export to support React.lazy
}
