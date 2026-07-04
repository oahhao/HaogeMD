import { createContext, useContext } from "react";
import type { MarkdownBlock } from "@/types/markdownBlock";

const BlockContext = createContext<MarkdownBlock | null>(null);

export const BlockProvider = BlockContext.Provider;
export const useBlockContext = () => useContext(BlockContext);
