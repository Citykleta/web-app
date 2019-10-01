import {css} from 'lit-element';

// language=CSS
export const style = css`
    citykleta-search-box,
    citykleta-location {
        background: var(--background-theme);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12),
        0 4px 4px rgba(0, 0, 0, 0.12),
        0 6px 4px rgba(0, 0, 0, 0.12);
    }
    
    citykleta-search-box{
        max-height: 16em;
    }

    citykleta-location {
        padding: 0 1em;
    }
    
    :host > *:not(:first-child){
        margin-top: 1em;
    }
`;
