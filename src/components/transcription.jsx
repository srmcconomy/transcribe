import React, { Component } from 'react';
import leftpad from 'left-pad';

import styles from './transcription.css';

export default class Transcription extends Component {
  constructor() {
    super();
    this.state = { data: [] };
  }

  scrollToBottom() {
    this.bottom.scrollIntoView();
  }

  componentDidMount() {
    const ws = new WebSocket('ws://transcribe.prettybigjoe.me:8088');
    ws.onopen = () => ws.send(JSON.stringify({ type: 'load', stream: this.props.stream }));
    ws.onmessage = data => {
      const newData = this.state.data;
      newData.push({ time: new Date(), message: data.data.trim() });
      this.setState({ data: newData });
    };
  }

  componentDidUpdate() {
    this.scrollToBottom();
  }

  render() {
    return (
      <div className={styles.transcription}>
        {this.state.data.map((data, i) => <div key={i} className={styles.message}><span className={styles.timestamp}>{data.time.getHours() % 12}:{leftpad(data.time.getMinutes(), 2, '0')}</span>{data.message}</div>)}
        <div ref={el => this.bottom = el} />
      </div>
    )
  }
}