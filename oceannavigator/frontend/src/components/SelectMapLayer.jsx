import React from 'react';
import * as ol from "ol";
import * as olproj from "ol/proj";
import * as olproj4 from "ol/proj/proj4";
import * as olcontrol from "ol/control";
import * as olsource from "ol/source";
import * as olloadingstrategy from "ol/loadingstrategy";
import * as olformat from "ol/format";
import * as oltilegrid from "ol/tilegrid";
import * as ollayer from "ol/layer";
import * as olstyle from "ol/style";
import * as olinteraction from "ol/interaction";
import * as olcondition from "ol/events/condition";
import * as olgeom from "ol/geom";
import * as olextent from "ol/extent";
import {Button} from 'react-bootstrap';

export default class SelectMapLayer extends React.Component {
    constructor (props) {
        super (props)
    }

    render () {

        let buttons = [];


        if (this.props.map.map !== undefined) {
            let layers = this.props.map.map.getLayers().getArray();
            for (let x in layers) {
                let layer = layers[x].values_
                if ('data' in layer) {
                    buttons.push(
                    <Button
                        onClick={() => this.props.select(layer.data)}
                    >
                        {layer.data.variable}
                    </Button>)
                }
            }
        }
        
        let header = []
        if (buttons.length > 0) {
            header.push(<h1>{this.props.name}</h1>)
        }

        return (
            <div>
                {header}
                {buttons}
            </div>
        )
    }
}