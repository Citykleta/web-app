export interface DirectionsApi {
    search(): Promise<void>;
}

export const factory = () => {
    return {
        async search() {
            // return fetch('')
        }
    };
};
