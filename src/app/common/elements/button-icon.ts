import {html, LitElement} from 'lit-element';
import {style} from './button-icon.style';

export const propDef = {
    label: {
        type: String,
        reflect: true
    }
};

export const template = ({label}) => html`<button><span id="button-label" hidden>${label}</span><slot></slot></button>`;

export class ButtonIcon extends LitElement {

    private label: string = 'fix me I have no accessible label!';

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
        return template({
            label: this.label
        });
    }
}
