/**
 * Content section types for Apple documentation
 */
/**
 * A run of inline content inside a paragraph or list item. Apple's render JSON
 * tags each run with a `type` (`text`, `codeVoice`, `reference`, …); only the
 * fields the formatter reads are modeled.
 */
export interface InlineContentItem {
    type?: string;
    text?: string;
    code?: string;
    identifier?: string;
}
export interface ListItem {
    content?: Array<{
        inlineContent?: InlineContentItem[];
    }>;
}
export interface ContentItem {
    type: string;
    text?: string;
    syntax?: string;
    code?: string[];
    inlineContent?: InlineContentItem[];
    items?: ListItem[];
}
export interface ContentSection {
    kind: string;
    content?: ContentItem[];
    declarations?: Array<{
        tokens?: Array<{
            text?: string;
        }>;
    }>;
    parameters?: Array<{
        name?: string;
        content?: Array<{
            inlineContent?: Array<{
                text?: string;
            }>;
        }>;
    }>;
}
//# sourceMappingURL=content-sections.d.ts.map