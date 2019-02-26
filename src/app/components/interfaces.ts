export interface Component {
    clean(): void;

    dom(): DocumentFragment | Element; //todo
}
