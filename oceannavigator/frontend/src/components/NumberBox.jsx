import React from 'react';
import {Modal, Button} from 'react-bootstrap';

class NumberBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            value: this.props.state
        }
    }
    updateParent() {
        this.props.onUpdate(this.props.id, this.state.value);
    }
    changed(e) {
        this.setState({
            value: this.refs.number.value,
        });
    }
    keyPress(e) {
        var key = e.which || e.keyCode;
        if (key == 13) {
            this.changed();
            this.updateParent();
            return false;
        } else {
            return true;
        }
    }
    closeHelp() {
        this.setState({
            showHelp: false
        });
    }
    showHelp() {
        this.setState({
            showHelp: true
        });
    }
    render() {
        var hasHelp = (this.props.children != null && this.props.children.length > 0);
        return (
            <div className='NumberBox input'>
                <h1>{this.props.title}
                    <span onClick={this.showHelp.bind(this)} style={{'display': hasHelp ? 'block' : 'none'}}>?</span>
                </h1>

                <Modal show={this.state.showHelp} onHide={this.closeHelp.bind(this)} bsSize="large" dialogClassName="helpdialog">
                    <Modal.Header closeButton>
                        <Modal.Title>{this.props.title} Help</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {this.props.children}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={this.closeHelp.bind(this)}>Close</Button>
                    </Modal.Footer>
                </Modal>

                <div>
                    <label htmlFor={this.props.id}>Value:</label>
                    <input ref='number' id={this.props.id} type='number' value={this.state.value} onChange={this.changed.bind(this)} onBlur={this.updateParent.bind(this)} onKeyPress={this.keyPress.bind(this)} />
                </div>
            </div>
        );
    }
}

export default NumberBox;
