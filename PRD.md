# Product Requirements Document (PDR): Monaco Mode for JSONata with JSON-bound Autocompletion

## Overview

The goal is to create a custom Monaco Editor language mode that simplifies editing JSONata queries. This includes syntax highlighting, error checking, and—most importantly—context-aware autocompletion based on a provided example JSON file representing the bound data model.

## Goals

Enable efficient authoring of JSONata queries.

Provide syntax highlighting and error checking for JSONata syntax.

Provide autocomplete for data keys from an example JSON file.

Support autocompletion for JSONata expressions and functions (e.g., `$uppercase(user.name)`).

Optional: Provide hover tooltips and signature help based on data types.

## User Stories

As a developer, I want syntax highlighting for JSONata functions and operators so I can visually distinguish query logic from data keys.

As a query author, I want autocompletion for expressions using data keys from my sample JSON so I can write queries faster and with fewer mistakes.

As a power user, I want to hover over query expressions and see data type hints from the JSON model.

## Technical Components

Language Definition
Create a custom Monaco language definition named `jsonata`.

Include rules for:

Expressions and function calls.

Comments `/* ... */`

Highlight operators, functions, and data keys.

## JSON Integration
Accept a sample JSON data object as input.

Parse the structure recursively to build a symbol table of available keys.

Autocomplete suggestions should reflect nested paths (e.g., `user.name`, `user.address.city`).

Autocompletion
Triggered automatically.

Suggest keys from the JSON structure.

Suggest JSONata functions.

Provide a display label, full path, and optionally, type information inferred from the JSON value.

Bonus: Support fuzzy matching.

## Hover / Tooltip Support
When hovering over a data key, show value type (string, number, object, array, etc.).

Optionally include example value from the JSON.

Diagnostics (Optional)
Warn on invalid variable paths not found in the provided JSON model.

Highlight syntax errors in the JSONata query.

## API / Usage
```ts
registerJSONataLanguage(monaco: MonacoNamespace, sampleData: object): void;
```
Registers the mode and enables autocompletion using `sampleData`.

## Stretch Goals
Integration with Monaco's snippet system for common JSONata expressions (e.g., mapping, filtering).

Live preview pane integration for rendering the query result with the example data.

Ability to mark parts of the JSON as optional or repeatable.

**Hover Provider for Functions**: Extend the hover provider to show tooltips for JSONata functions, including their signatures and descriptions.


## Preferred technology

Prefer using `pnpm` for package management.

## Example implementation

This might be helpful. If not, please ignore:

```ts
monaco.languages.register({ id: 'jsonata' });

monaco.languages.registerCompletionItemProvider('jsonata', {
    provideCompletionItems: () => {
        var autocompleteProviderItems = [];
        var keywords = [
            // See https://docs.jsonata.org/overview.html
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

        for (var i = 0; i < keywords.length; i++) {
            autocompleteProviderItems.push({ 'label': keywords[i], kind: monaco.languages.CompletionItemKind.Function });
        }

        return {suggestions: autocompleteProviderItems};
    }
});

monaco.editor.create(document.getElementById("container"), {
	language: "jsonata-json"
});
  
```
