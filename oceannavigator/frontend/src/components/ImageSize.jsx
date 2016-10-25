import React from 'react'

class ImageSize extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            width: 10,
            height: 7.5,
            dpi: 72,
        };
    }
    show(e) {
        var p = $(e.target.parentNode);
        if (p.hasClass("collapsed")) {
            p.removeClass("collapsed");
        } else {
            p.addClass("collapsed");
        }
        p.children("div").slideToggle("fast");
    }
    changed() {
        this.setState({
            width: parseFloat(this.refs.width.value),
            height: parseFloat(this.refs.height.value),
            dpi: parseFloat(this.refs.dpi.value),
        });
        this.props.onUpdate('size', parseFloat(this.refs.width.value) + 'x' + parseFloat(this.refs.height.value));
        this.props.onUpdate('dpi', parseFloat(this.refs.dpi.value));
    }
    render() {
        return (
            <div className='Size input'>
                <h1 onClick={this.show.bind(this)}>{this.props.title}</h1>
                <table>
                    <tbody>
                        <tr>
                            <td><label htmlFor={this.props.id + '_width'}>Width:</label></td>
                            <td><input ref='width' id={this.props.id + '_width'} type='number' step='0.25' defaultValue={parseFloat(this.state.width).toFixed(2)} onBlur={this.changed.bind(this)} /></td>
                            <td>in</td>
                        </tr>
                        <tr>
                            <td><label htmlFor={this.props.id + '_height'}>Height:</label></td>
                            <td><input ref='height' id={this.props.id + '_height'} type='number' step='0.25' defaultValue={parseFloat(this.state.height).toFixed(2)} onBlur={this.changed.bind(this)} /></td>
                            <td>in</td>
                        </tr>
                        <tr>
                            <td><label htmlFor={this.props.id + '_dpi'}>DPI:</label></td>
                            <td><input ref='dpi' id={this.props.id + '_dpi'} type='number' step='1' defaultValue={parseFloat(this.state.dpi).toFixed(0)} onBlur={this.changed.bind(this)} /></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

export default ImageSize;

