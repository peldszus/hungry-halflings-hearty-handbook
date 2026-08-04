# 1. OBJECTIVE

Add an optional `notes` field to the Recipe model that:

- Stores preparation instructions and additional notes as markdown
- Is editable via a simple WYSIWYG toolbar in the recipe edit screen
- Is rendered as formatted markdown in the recipe detail view

# 2. CONTEXT SUMMARY

**Current state:**

- `Recipe` interface in `src/stores/recipes.ts` defines: id, name, ingredients, labels, servings, lastEditedAt, archived, favourite, url
- `RecipeDetailView.vue` displays recipe details with name, metadata, labels, and ingredients
- `RecipeEditView.vue` provides a form with name, labels, ingredients, servings, and URL fields
- `dataTransfer.ts` handles import/export of recipes with normalization for backward compatibility
- No markdown library currently exists in the project

**Tech stack:**

- Vue 3 + Composition API + TypeScript
- Vuetify 4 for UI components
- Pinia for state management
- localStorage persistence

# 3. APPROACH OVERVIEW

1. **Add `marked` for markdown parsing** - lightweight, tree-shakeable markdown parser
2. **Add `dompurify` for XSS sanitization** - sanitize rendered HTML to prevent XSS attacks
3. **Extend the Recipe interface** with optional `notes?: string` field
4. **Create a MarkdownEditor component** - toolbar with formatting buttons (bold, italic, headers, lists, links) wrapping a textarea, with the toolbar inserting markdown syntax around selected text
5. **Update RecipeEditView** to include the notes editor
6. **Update RecipeDetailView** to render notes as sanitized markdown HTML
7. **Update dataTransfer.ts** to handle notes field in import/export with proper normalization
8. **Update tests** to cover notes functionality

# 4. IMPLEMENTATION STEPS

### Step 1: Install markdown dependencies

- **Goal:** Add markdown parsing and sanitization libraries
- **Method:** Add `marked` and `dompurify` to package.json dependencies
- **Reference:** `package.json`

### Step 2: Extend Recipe interface

- **Goal:** Add optional notes field to the data model
- **Method:** Add `notes?: string` to the Recipe interface in `src/stores/recipes.ts`
- **Reference:** `src/stores/recipes.ts:12-22`

### Step 3: Create MarkdownEditor component

- **Goal:** Provide a WYSIWYG-style markdown editing experience
- **Method:** Create `src/components/MarkdownEditor.vue` with:
  - A toolbar containing formatting buttons (bold, italic, heading, unordered list, ordered list, link, code)
  - A textarea bound to the model value
  - Buttons insert markdown syntax around selected text or at cursor position
  - Styled with Vuetify components to match the app's design
  - **Fix toolbar icon visibility**: The toolbar uses `surface-variant` background which is dark in light mode and light in dark mode. The toolbar button icons must use `color="on-surface-variant"` so they remain visible (dark icons on light bg, light icons on dark bg)
  - **Fix inline code styling**: The `code` element inside `.notes-content` uses `surface-variant` for background, which is also flipped. Use `surface-container-highest` instead for proper contrast in both themes
- **Reference:** `src/components/MarkdownEditor.vue`

### Step 3b: Fix RecipeDetailView eslint comment rendering

- **Goal:** Remove the visible eslint-disable comment from rendered output
- **Method:** The current code has `/* eslint-disable-line vue/no-v-html */` inside the template which renders as visible text. Move the directive to its own line before the element so it doesn't appear as text content:
  ```vue
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div v-html="notesHtml" class="notes-content" />
  ```
- **Reference:** `src/views/RecipeDetailView.vue:284-286`

### Step 4: Update RecipeEditView

- **Goal:** Add notes field to the recipe form
- **Method:**
  - Import and add MarkdownEditor component
  - Add `notes` ref initialized from existing recipe, duplicate source, or empty string
  - Include MarkdownEditor with label "Notes (optional)" before the save bar
  - Include `notes` in the save payload and snapshot comparison for dirty detection
- **Reference:** `src/views/RecipeEditView.vue`

### Step 5: Update RecipeDetailView

- **Goal:** Render notes as formatted markdown
- **Method:**
  - Import `marked` and `DOMPurify`
  - Configure marked for safe HTML output
  - Add computed property that sanitizes and parses notes
  - Display notes section with "Notes" heading when notes exist, using `v-html` with sanitized content
  - Place after the ingredients section
- **Reference:** `src/views/RecipeDetailView.vue`

### Step 6: Update dataTransfer.ts

- **Goal:** Handle notes in import/export
- **Method:**
  - Update `normalizeRecipe` function to include notes field
  - Notes should be an optional string, defaulting to undefined for legacy recipes
  - Ensure notes are preserved when exporting
- **Reference:** `src/utils/dataTransfer.ts:80-108`

### Step 7: Update tests

- **Goal:** Ensure notes functionality is properly tested
- **Method:**
  - Add test to `recipes.test.ts` for round-tripping notes field
  - Add test to `RecipeEditView.test.ts` for saving and prefilling notes
  - Add test to `RecipeDetailView.test.ts` for rendering notes as markdown
  - Update dataTransfer tests if needed
- **Reference:**
  - `src/stores/recipes.test.ts`
  - `src/views/RecipeEditView.test.ts`
  - `src/views/RecipeDetailView.test.ts`

# 5. TESTING AND VALIDATION

**Success criteria:**

1. Recipe can be created with notes containing markdown (e.g., `**bold**, *italic*, # heading`)
2. Notes are persisted to localStorage and restored correctly
3. Recipe edit form prefills notes when editing an existing recipe
4. Recipe edit form prefills notes when duplicating a recipe
5. Notes are rendered as formatted HTML in the detail view (bold shows bold, headings show as h1/h2, etc.)
6. Notes field is optional - recipes without notes display correctly
7. Export/import preserves notes content
8. Legacy recipes (without notes field) continue to work after migration
9. All existing tests pass
10. Type checking passes with new notes field
11. **Toolbar icons are visible in both light and dark modes** - use `on-surface-variant` color for toolbar icons
12. **Inline code has correct background color in both themes** - use appropriate theme token instead of `surface-variant`
13. **No eslint-disable comments appear in rendered output** - use proper Vue comment syntax for eslint directives

**Manual testing checklist:**

- Create a new recipe with markdown notes → verify display renders correctly
- Edit an existing recipe → add notes with various formatting → save → verify persistence
- Duplicate a recipe with notes → verify notes are copied
- Export recipes → import → verify notes survive the round-trip
- View a recipe with complex markdown (lists, code blocks, links) → verify safe rendering
- **Verify toolbar icons are visible**: Switch between light and dark modes, toolbar icons should always be clearly visible (dark on light bg, light on dark bg)
- **Verify inline code styling**: Check that `code` blocks have readable contrast in both light and dark modes
- **Verify no stray comments**: Ensure no eslint-disable text appears in the rendered notes section
