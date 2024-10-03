'use client'

import {  useRef, useState } from "react";
import { parseVcdFromFileContent, VcdViewer, VcdViewerVanilla } from "@/components/vcd-viewer";
import vcdContent from '@/data/vcd'
import {
    useEvent,
    useIsomorphicLayoutEffect,
}                           from '@reusable-ui/core'
import { type Vcd } from "@/models";



export default function Home() {
    const [vcd, setVcd] = useState<Vcd|null>(() => parseVcdFromFileContent(vcdContent));
    const [vcdVersion, setVcdVersion] = useState<any>(() => new Date());
    const handleFileOpen = useEvent<React.ChangeEventHandler<HTMLInputElement>>(async (event) => {
        const file : File|null = event.currentTarget.files?.[0] ?? null;
        if (!file) return;
        
        const fileContent = await file.text();
        const newVcd = parseVcdFromFileContent(fileContent);
        setVcd(newVcd);
        setVcdVersion(new Date(file.lastModified));
        
        vcdViewerVanillaRef.current?.setVcd(newVcd);
    });
    
    
    
    const vcdViewerVanillaRef = useRef<VcdViewerVanilla|null>(null);
    useIsomorphicLayoutEffect(() => {
        // conditions:
        const placeholderElm = document.querySelector('#vcd-viewer-placeholder');
        if (!placeholderElm) return;
        
        
        
        // setups:
        const vcdViewer = new VcdViewerVanilla(placeholderElm);
        vcdViewer.setVcd(vcd);
        vcdViewerVanillaRef.current = vcdViewer;
        
        
        
        // cleanups:
        return () => {
            vcdViewer.destroy();
            vcdViewerVanillaRef.current = null;
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
            <VcdViewer vcd={vcd} vcdVersion={vcdVersion} />
            <hr />
            <p>
                Open a *.vcd file from your computer:
            </p>
            <input type='file' accept='.vcd' onChange={handleFileOpen} multiple={false} />
            <p>parsed:</p>
            <pre>
                {JSON.stringify(vcd, undefined, 4)}
            </pre>
        </div>
    );
}
