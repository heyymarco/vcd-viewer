import Image from "next/image";
// import styles from "./page.module.css";
import { VcdViewer } from "@/components/vcd-viewer";

export default function Home() {
    return (
        <div>
            <VcdViewer vcd='' />
        </div>);
}
