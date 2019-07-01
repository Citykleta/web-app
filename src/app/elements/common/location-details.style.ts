import {css} from 'lit-element';

// language=CSS
export const style = css`

    h2 {
        border-bottom: 2px solid var(--color-theme);
    }

    .location {
        margin: 0;
    }

    .description {
        font-size: 0.95em;
        font-style: italic;
    }

    .location span:last-child {
        font-weight: 300;
        font-style: italic;
        text-align: right;
    }
`;
