import React, { Component } from 'react';
import { List, Map } from 'immutable';
import leftpad from 'left-pad';

import styles from './transcription.css';

export default class Transcription extends Component {
  constructor() {
    super();
    this.state = {
      list: new List(),
      map: new Map(),
    };
  }

  scrollToBottom() {
    this.bottom.scrollIntoView();
  }

  componentDidMount() {
    const ws = new WebSocket('ws://transcribe.prettybigjoe.me:8088');
    // const ws = new WebSocket('ws://localhost:3000');
    ws.onopen = () => ws.send(JSON.stringify({ type: 'load', stream: this.props.stream }));
    ws.onmessage = json => {
      const data = JSON.parse(json.data);
      const id = `${data.i0}/${data.i1}`;
      const time = new Date();
      if (this.state.map.has(id)) {
        const index = this.state.map.get(id).index;
        this.setState({
          list: this.state.list.set(
            index,
            {
              text: data.text.trim(),
              id,
              time,
            }
          ),
          map: this.state.map.set(
            id,
            {
              text: data.text.trim(),
              index,
              time,
            },
          ),
        });
      } else {
        const index = this.state.list.size;
        this.setState({
          list: this.state.list.push({
            text: data.text.trim(),
            id,
            time,
          }),
          map: this.state.map.set(
            id,
            {
              text: data.text.trim(),
              index,
              time,
            },
          ),
        });
      }
    };
  }

  componentDidUpdate() {
    this.scrollToBottom();
  }

  render() {
    return (
      <div className={styles.transcription}>
        {this.state.list.map((data, i) => <div key={i} className={styles.message}><span className={styles.timestamp}>{data.time.getHours() % 12}:{leftpad(data.time.getMinutes(), 2, '0')}</span>{data.text}</div>)}
        <div ref={el => this.bottom = el} />
      </div>
    )
  }
}
