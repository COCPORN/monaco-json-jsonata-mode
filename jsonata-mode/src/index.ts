import * as monaco from 'monaco-editor';
import jsonata from 'jsonata';

interface IObject {
    [key: string]: any;
}

function isObject(item: any): item is IObject {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

function getObjectFromPath(obj: any, path: string): any {
    if (!path || path === '') {
        return obj;
    }
    // Basic path traversal, doesn't handle complex JSONata
    return path.split('.').reduce((currentObject, key) => {
        return currentObject && typeof currentObject === 'object' ? currentObject[key] : undefined;
    }, obj);
}

function validate(model: monaco.editor.ITextModel, monacoNs: typeof monaco, sampleData: object): void {
    const markers: monaco.editor.IMarkerData[] = [];
    const lines = model.getLinesContent();

    lines.forEach((line, i) => {
        const trimmedLine = line.trim();
        if (trimmedLine === '' || trimmedLine.startsWith('/*')) {
            return; // Ignore empty lines and comments
        }

        try {
            // This will throw an error for syntax issues
            jsonata(trimmedLine);
        } catch (e: any) {
            const startColumn = line.indexOf(trimmedLine) + (e.position || 0) + 1;
            const endColumn = startColumn + (e.token ? e.token.length : 1);
            markers.push({
                message: e.message,
                severity: monacoNs.MarkerSeverity.Error,
                startLineNumber: i + 1,
                startColumn: startColumn,
                endLineNumber: i + 1,
                endColumn: endColumn,
            });
        }
    });

    monacoNs.editor.setModelMarkers(model, 'jsonata-json', markers);
}

export function registerJSONataLanguage(monacoNs: typeof monaco, initialSampleData: object) {
    const languageId = 'jsonata-json';
    let currentSampleData: IObject = Array.isArray(initialSampleData) ? initialSampleData[0] : initialSampleData;

    const setData = (data: object) => {
        currentSampleData = Array.isArray(data) ? data[0] : data;
        monacoNs.editor.getModels().forEach((model: monaco.editor.ITextModel) => {
            if (model.getLanguageId() === languageId) {
                validate(model, monacoNs, currentSampleData);
            }
        });
    };

    setData(initialSampleData);

    monacoNs.languages.register({ id: languageId });

    monacoNs.languages.setLanguageConfiguration(languageId, {
        brackets: [['(', ')'], ['[', ']'], ['{', '}']],
        autoClosingPairs: [
            { open: '(', close: ')' },
            { open: '[', close: ']' },
            { open: '{', close: '}' },
            { open: "'", close: "'", notIn: ['string'] },
            { open: '"', close: '"', notIn: ['string'] }
        ],
        comments: {
            lineComment: '//',
            blockComment: ['/*', '*/']
        }
    });

    const jsonataKeywords = [
        '$abs', '$append', '$assert', '$average', '$base64decode', '$base64encode',
        '$boolean', '$ceil', '$contains', '$count', '$decodeUrl', '$decodeUrlComponent',
        '$each', '$encodeUrl', '$encodeUrlComponent', '$entries', '$error', '$eval',
        '$exists', '$filter', '$floor', '$formatBase', '$formatDate', '$formatInteger',
        '$fromMillis', '$join', '$keys', '$length', '$lookup', '$lowercase', '$map',
        '$max', '$merge', '$millis', '$min', 'now', '$number', '$pad', '$parseDate',
        '$partition', '$power', '$random', '$reduce', '$replace', '$reverse', '$round',
        '$shuffle', '$sift', '$single', '$sort', '$split', '$spread', '$sqrt', '$string',
        '$substring', '$substringAfter', '$substringBefore', '$sum', '$toMillis',
        '$trim', '$type', '$uppercase', '$zip'
    ];

    monacoNs.languages.setMonarchTokensProvider(languageId, {
        keywords: jsonataKeywords,
        tokenizer: {
            root: [
                [/[a-zA-Z_]\w*/, {
                    cases: {
                        '@keywords': 'keyword',
                        '@default': 'identifier'
                    }
                }],
                [/\$\w+/, 'function'],
                [/"(?:[^"\\]|\\.)*$/, 'string.invalid'],
                [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
                [/\/\*/, 'comment', '@comment'],
                [/\/\/.*$/, 'comment']
            ],
            comment: [
                [/[^\/*]+/, 'comment'],
                [/\*\//, 'comment', '@pop'],
                [/[/\*]/, 'comment']
            ],
            string: [
                [/[^\\"]+/, 'string'],
                [/\\./, 'string.escape.invalid'],
                [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
            ]
        }
    });

    monacoNs.languages.registerCompletionItemProvider(languageId, {
        triggerCharacters: ['.'],
        provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position) => {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn
            };

            const lineContent = model.getLineContent(position.lineNumber);
            const textUntilPosition = lineContent.substring(0, position.column - 1);

            let parentObject: any = currentSampleData;
            let addKeywords = true;

            const lastDotIndex = textUntilPosition.lastIndexOf('.');
            if (lastDotIndex > -1) {
                const pathPrefix = textUntilPosition.substring(0, lastDotIndex);
                const pathMatch = pathPrefix.match(/[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*$/);
                if (pathMatch) {
                    const path = pathMatch[0];
                    parentObject = getObjectFromPath(currentSampleData, path);
                    addKeywords = false;
                }
            }

            let suggestions: monaco.languages.CompletionItem[] = [];

            if (parentObject && typeof parentObject === 'object' && !Array.isArray(parentObject)) {
                suggestions.push(...Object.keys(parentObject).map(key => ({
                    label: key,
                    kind: isObject(parentObject[key]) ? monacoNs.languages.CompletionItemKind.Module : monacoNs.languages.CompletionItemKind.Field,
                    insertText: key,
                    range: range,
                })));
            }

            if (addKeywords) {
                suggestions.push(...jsonataKeywords.map(keyword => ({
                    label: keyword,
                    kind: monacoNs.languages.CompletionItemKind.Function,
                    insertText: keyword,
                    range: range
                })));
            }

            return { suggestions };
        }
    });

    monacoNs.languages.registerHoverProvider(languageId, {
        provideHover: (model, position) => {
            const word = model.getWordAtPosition(position);
            if (!word) return;

            const range = new monacoNs.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
            const variablePath = word.word;
            
            const value = getObjectFromPath(currentSampleData, variablePath);
            if (value !== undefined) {
                const valueString = typeof value === 'object' ? JSON.stringify(value, null, 2) : value.toString();
                return {
                    range: range,
                    contents: [
                        { value: `**${variablePath}**` },
                        { value: '```' + (typeof value) + '\n' + valueString + '\n```' }
                    ]
                };
            }
            return;
        }
    });

    monacoNs.editor.onDidCreateModel((model: monaco.editor.ITextModel) => {
        if (model.getLanguageId() === languageId) {
            const listener = model.onDidChangeContent(() => {
                validate(model, monacoNs, currentSampleData);
            });
            model.onWillDispose(() => listener.dispose());
            validate(model, monacoNs, currentSampleData);
        }
    });

    return {
        update: (newSampleData: object) => {
            setData(newSampleData);
        }
    };
}