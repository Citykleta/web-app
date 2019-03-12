export const truncate = (value: number): number => Math.trunc(value * 10 ** 6) / 10 ** 6;

export const debounce = (fn, time = 300) => {
    let timer = null;
    return (...args) => {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => fn(...args), time);
    };
};
