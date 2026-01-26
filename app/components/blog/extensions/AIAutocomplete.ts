import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface AIAutocompleteOptions {
  /**
   * Function to fetch autocomplete suggestions
   */
  getSuggestion: (context: string) => Promise<string | null>;
  /**
   * Debounce delay in ms before fetching suggestion
   */
  debounceMs?: number;
  /**
   * Minimum characters before triggering autocomplete
   */
  minChars?: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiAutocomplete: {
      acceptSuggestion: () => ReturnType;
      dismissSuggestion: () => ReturnType;
    };
  }
}

export const AIAutocompletePluginKey = new PluginKey('aiAutocomplete');

export const AIAutocomplete = Extension.create<AIAutocompleteOptions>({
  name: 'aiAutocomplete',

  addOptions() {
    return {
      getSuggestion: async () => null,
      debounceMs: 1500,
      minChars: 20,
    };
  },

  addCommands() {
    return {
      acceptSuggestion:
        () =>
        ({ editor, state, dispatch }) => {
          const pluginState = AIAutocompletePluginKey.getState(state);
          if (pluginState?.suggestion && dispatch) {
            editor.commands.insertContent(pluginState.suggestion);
            return true;
          }
          return false;
        },
      dismissSuggestion:
        () =>
        ({ state, dispatch }) => {
          if (dispatch) {
            // This will trigger a state update that clears the suggestion
            dispatch(state.tr.setMeta(AIAutocompletePluginKey, { dismiss: true }));
          }
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const pluginState = AIAutocompletePluginKey.getState(this.editor.state);
        if (pluginState?.suggestion) {
          return this.editor.commands.acceptSuggestion();
        }
        return false;
      },
      Escape: () => {
        const pluginState = AIAutocompletePluginKey.getState(this.editor.state);
        if (pluginState?.suggestion) {
          return this.editor.commands.dismissSuggestion();
        }
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    const { getSuggestion, debounceMs, minChars } = this.options;
    let debounceTimer: NodeJS.Timeout | null = null;
    let currentController: AbortController | null = null;

    return [
      new Plugin({
        key: AIAutocompletePluginKey,

        state: {
          init() {
            return {
              suggestion: null as string | null,
              loading: false,
              position: 0,
            };
          },
          apply(tr, value) {
            // Handle dismiss
            const meta = tr.getMeta(AIAutocompletePluginKey);
            if (meta?.dismiss) {
              return { ...value, suggestion: null, loading: false };
            }
            if (meta?.suggestion !== undefined) {
              return { ...value, suggestion: meta.suggestion, loading: false, position: meta.position };
            }
            if (meta?.loading !== undefined) {
              return { ...value, loading: meta.loading };
            }
            // Clear suggestion on any document change
            if (tr.docChanged) {
              return { ...value, suggestion: null };
            }
            return value;
          },
        },

        view(view) {
          return {
            update(view, prevState) {
              const { state } = view;

              // Don't trigger if document hasn't changed
              if (prevState.doc.eq(state.doc)) return;

              // Clear any pending request
              if (debounceTimer) clearTimeout(debounceTimer);
              if (currentController) currentController.abort();

              // Get current text content
              const text = state.doc.textContent;

              // Don't trigger if text is too short
              if (text.length < (minChars || 20)) return;

              // Check if cursor is at end of document or paragraph
              const { $from } = state.selection;
              const isAtEnd = $from.pos === state.doc.content.size - 1 ||
                              $from.parent.content.size === $from.parentOffset;

              if (!isAtEnd) return;

              // Set loading state
              view.dispatch(
                state.tr.setMeta(AIAutocompletePluginKey, { loading: true })
              );

              // Debounce the API call
              debounceTimer = setTimeout(async () => {
                currentController = new AbortController();

                try {
                  // Get the last ~200 chars as context
                  const context = text.slice(-200);
                  const suggestion = await getSuggestion(context);

                  if (suggestion && view.state.doc.textContent.endsWith(context.slice(-50))) {
                    view.dispatch(
                      view.state.tr.setMeta(AIAutocompletePluginKey, {
                        suggestion,
                        position: view.state.selection.$from.pos,
                      })
                    );
                  }
                } catch (error) {
                  if ((error as Error).name !== 'AbortError') {
                    console.error('AI autocomplete error:', error);
                  }
                  view.dispatch(
                    view.state.tr.setMeta(AIAutocompletePluginKey, { loading: false })
                  );
                }
              }, debounceMs);
            },
            destroy() {
              if (debounceTimer) clearTimeout(debounceTimer);
              if (currentController) currentController.abort();
            },
          };
        },

        props: {
          decorations(state) {
            const pluginState = this.getState(state);
            if (!pluginState?.suggestion) return DecorationSet.empty;

            const { $from } = state.selection;

            // Create a widget decoration for the ghost text
            const widget = Decoration.widget(
              $from.pos,
              () => {
                const span = document.createElement('span');
                span.className = 'ai-suggestion';
                span.textContent = pluginState.suggestion;
                span.style.cssText = `
                  color: #6366f1;
                  opacity: 0.5;
                  pointer-events: none;
                  user-select: none;
                  background: linear-gradient(90deg, rgba(99,102,241,0.1) 0%, transparent 100%);
                  padding: 0 2px;
                  border-radius: 2px;
                `;
                return span;
              },
              { side: 1 }
            );

            return DecorationSet.create(state.doc, [widget]);
          },
        },
      }),
    ];
  },
});

export default AIAutocomplete;
