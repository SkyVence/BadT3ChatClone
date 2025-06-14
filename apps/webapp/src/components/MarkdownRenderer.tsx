"use client";
import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import { MarkdownCodeBlock } from "./markdown";

// Plugin to fix bolded code
export function remarkFixBoldedCode() {
    return (tree: any) => {
        visit(tree, "text", (node) => {
            const regex = /\*\*\`(.+?)\`\*\*/g;
            if (regex.test(node.value)) {
                node.value = node.value.replace(regex, "`$1`");
            }
        });
    };
}

// Plugin to add parent references
export function rehypeAddParents() {
    return (tree: any) => {
        visit(tree, (node: any, _index: any, parent: any) => {
            if (node && typeof node === "object") {
                (node as any).parent = parent;
            }
        });
    };
}

// MarkdownRenderer component
export default function MarkdownRenderer({ content }: { content: string }) {
    // Memoize markdown components
    const markdownComponents = useMemo(() => {
        const CodeRenderer = ({ className = "", children, node, ...props }: any) => {
            // Detect block code: the direct parent must be a <pre> element
            const isBlock = typeof node?.parent?.tagName === "string" && node.parent.tagName.toLowerCase() === "pre";
            if (isBlock) return null;
            const text = Array.isArray(children) ? children.join("") : children;
            return (
                <code className="bg-muted px-1 py-0.5 rounded-md font-mono text-blue-400 text-sm" {...props}>
                    {text}
                </code>
            );
        };
        const PreRenderer = ({ children, node, ...props }: any) => {
            let languageClass = "";
            let codeString = "";
            if (node && Array.isArray(node.children)) {
                const codeNode: any = node.children.find((n: any) => n.tagName === "code") || node.children[0];
                if (codeNode) {
                    languageClass = (codeNode.properties?.className ?? []).join(" ");
                    if (Array.isArray(codeNode.children) && codeNode.children[0]?.value) {
                        codeString = codeNode.children.map((c: any) => c.value || "").join("");
                    }
                }
            }
            if (!codeString && Array.isArray(children) && children.length) {
                const codeElem: any = children[0];
                languageClass = codeElem?.props?.className || languageClass;
                const raw = codeElem?.props?.children;
                codeString = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.join("") : "";
            }
            return (
                <MarkdownCodeBlock className={languageClass} {...props}>
                    {codeString}
                </MarkdownCodeBlock>
            );
        };
        return {
            code: CodeRenderer,
            pre: PreRenderer,
        } as const;
    }, []);

    return (
        <ReactMarkdown
            components={markdownComponents}
            remarkPlugins={[remarkGfm, remarkFixBoldedCode]}
            rehypePlugins={[rehypeAddParents]}
        >
            {content}
        </ReactMarkdown>
    );
} 