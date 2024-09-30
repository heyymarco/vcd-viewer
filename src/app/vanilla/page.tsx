'use client'

import { useMemo } from "react";
import { parseVcdFromFileContent, VcdViewer, VcdViewerVanilla } from "@/components/vcd-viewer";
import vcdContent from '@/data/vcd'
import {
    useIsomorphicLayoutEffect,
}                           from '@reusable-ui/core'



export default function Home() {
    // important: always memorize the vcd (json) object to make sure it always the same object reference,
    // otherwise the <VcdViewer> resets the order state and the user's changes lost
    const vcd = useMemo(() => parseVcdFromFileContent(vcdContent), []);
    
    useIsomorphicLayoutEffect(() => {
        // conditions:
        const placeholderElm = document.querySelector('#vcd-viewer-placeholder');
        if (!placeholderElm) return;
        
        
        
        // setups:
        const vcdViewer = new VcdViewerVanilla(placeholderElm);
        vcdViewer.setVcd(vcd);
        
        
        
        // cleanups:
        return () => {
            vcdViewer.destroy();
        };
    }, []);
    
    return (
        <div>
            <p>
                Vanilla version:
            </p>
            <div id='vcd-viewer-placeholder'></div>
            <hr />
            <p>
                React version:
            </p>
            <VcdViewer vcd={vcd} />
            <hr />
            <p>parsed:</p>
            <pre>
                {JSON.stringify(vcd, undefined, 4)}
            </pre>
        </div>
    );
}
