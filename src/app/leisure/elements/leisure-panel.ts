import {html, LitElement} from 'lit-element';
import {style} from './leisure-panel.style';

export const template = () => html`<p>Hello leisure (Work in Progress)</p>`;

export const propDef = {};

export class LeisurePanel extends LitElement {

    constructor() {
        super();
    }

    static get styles() {
        return style;
    }

    static get properties() {
        return propDef;
    }

    render() {
        return template();
    }
}

