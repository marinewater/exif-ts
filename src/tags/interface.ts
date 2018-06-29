export interface IExifTags {
    [ byte: number ]: string;
}

export interface IStringValues {
    [ type: string ]: {
        [ byte: number ]: string
    };
}
