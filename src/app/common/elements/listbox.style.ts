import {css} from 'lit-element';

// language=CSS
export const style = css`
    :host {
        --listbox-background: inherit;
        --listbox-color: inherit;
        --listbox-option-background: inherit;
        --listbox-option-color: inherit;
        --listbox-option-border-color: var(--background-theme-1);
    }

    citykleta-listbox {
        margin: 0;
        overflow: scroll;
        padding: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
    }

    citykleta-listbox-option {
        font-size: 0.95em;
        padding: 0.5em 1em;
        background: var(--listbox-option-background);
        color: var(--listbox-option-color);
        transition: background-color 0.3s, color 0.3s;
    }

    citykleta-listbox-option[aria-selected=true] {
        --listbox-option-background: var(--color-theme-1);
        --listbox-option-color: var(--font-color-theme-2);
    }

    citykleta-listbox-option:not(:last-child) {
        border-bottom: 1px solid var(--listbox-option-border-color);
    }
`;
