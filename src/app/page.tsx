'use client'

import Image from "next/image";
// import styles from "./page.module.css";
import { parseVcdFromFileContent, VcdViewer } from "@/components/vcd-viewer";
import vcdContent from '@/data/vcd'

export default function Home() {
    const vcd = parseVcdFromFileContent(vcdContent);
    return (
        <div>
            <VcdViewer vcd={vcd} />
            <hr />
            <p>parsed:</p>
            <pre>
                {JSON.stringify(vcd, undefined, 4)}
            </pre>
        </div>
    );
}
