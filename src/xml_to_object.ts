interface IXmlObject {
    [ name: string ]: IXmlValue | IXmlValue[];
}

interface IJsonObject {
    [ name: string ]: IJsonValue | IJsonValue[];
}

type IJsonValue = IJsonObject | string;
type IXmlValue = IJsonObject | string;

export function xml2Object( xml: Document ): IXmlObject | string {

    if ( xml.children.length > 0 ) {

        const obj: IXmlObject = {};

        for ( let i = 0; i < xml.children.length; i++ ) {

            const item = xml.children.item( i );
            const attributes = item.attributes;

            for ( const idx in attributes ) {

                if ( attributes[ idx ] ) {
                    const itemAtt = attributes[ idx ];
                    const dataKey = itemAtt.nodeName;
                    const dataValue = itemAtt.nodeValue;

                    if ( dataKey !== undefined ) {
                        obj[ dataKey ] = dataValue;
                    }
                }

            }

            const nodeName = item.nodeName;

            if ( typeof ( obj[ nodeName ] ) === 'undefined' ) {
                obj[ nodeName ] = xml2json( item );
            }
            else {

                if ( typeof ( ( obj[ nodeName ] as IXmlValue[] ).push ) === 'undefined' ) {

                    const old = obj[nodeName];

                    obj[ nodeName ] = [];
                    ( obj[ nodeName ] as IXmlValue[] ).push( old as IXmlValue );

                }

                ( obj[ nodeName ] as IXmlValue[] ).push( xml2json( item ) );

            }

        }

        return obj;

    }
    else {
        return xml.textContent;
    }

}

function xml2json( xml: Element ): IJsonObject | string {

    const json: IJsonObject = {};

    if ( xml.nodeType === 1 ) { // element node

        if ( xml.attributes.length > 0 ) {

            json[ '@attributes' ] = {};

            for ( let j = 0; j < xml.attributes.length; j++ ) {

                const attribute = xml.attributes.item( j );
                ( json[ '@attributes' ] as IJsonObject )[ attribute.nodeName ] = attribute.nodeValue;

            }
        }

    }
    else if ( xml.nodeType === 3 ) { // text node
        return xml.nodeValue;
    }

    // deal with children
    if ( xml.hasChildNodes() ) {

        for ( let i = 0; i < xml.childNodes.length; i++ ) {

            const child = xml.childNodes.item( i );
            const nodeName = child.nodeName;

            if ( json[ nodeName ] == null ) {
                json[ nodeName ] = xml2json( child as Element );
            }
            else {

                if ( ( json[ nodeName ] as IJsonValue[] ).push == null ) {
                    const old = json[ nodeName ];
                    json[ nodeName ] = [];
                    ( json[ nodeName ] as IJsonValue[] ).push( old as IJsonValue );
                }
                ( json[ nodeName ] as IJsonValue[] ).push( xml2json( child as Element ) );

            }
        }

    }

    return json;
}
