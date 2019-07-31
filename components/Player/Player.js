import { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Replayer } from 'rrweb';
import 'rrweb/dist/rrweb.min.css';

const Player = ({ replay, handleOutsideClick }) => {
  const wrapperRef = useRef();
  const playerRef = useRef();
  const [scale, setScale] = useState();
  const [availableWidth, setAvailableWidth] = useState();
  const [availableHeight, setAvailableHeight] = useState();
  const [contentWidth, setContentWidth] = useState();
  const [contentHeight, setContentHeight] = useState();
  const id = 'player-display';

  const setAvailableDimensions = () => {
    if (!wrapperRef || !wrapperRef.current) return;
    const { width, height } = wrapperRef.current.getBoundingClientRect();
    setAvailableWidth(width);
    setAvailableHeight(height);
  };

  const handleClick = (event) => {
    if (playerRef
      && playerRef.current
      && playerRef.current.contains(event.target)) {
      return;
    }
    handleOutsideClick();
  };

  useEffect(() => {
    const replayer = new Replayer(replay.events, {
      root: playerRef.current,
    });
    replayer.play();
    replayer.on('resize', (event) => {
      setContentWidth(event.width);
      setContentHeight(event.height);
      setAvailableDimensions();
    });
    window.addEventListener('resize', setAvailableDimensions);
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      window.removeEventListener('resize', setAvailableDimensions);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, []);

  useEffect(() => {
    // Account for browser precision for transform CSS property by decreasing
    // available width and height
    setScale(Math.min(
      (availableWidth - 8) / contentWidth,
      (availableHeight - 8) / contentHeight,
    ));
  }, [availableWidth, availableHeight, contentWidth, contentHeight]);

  return (
    <div className="player-container">
      <div ref={wrapperRef} className="player-wrapper">
        <div
          id={id}
          style={{
            transform: `translate(-${50 * scale}%, -${50 * scale}%) scale(${scale})`,
          }}
          ref={playerRef}
        />
      </div>
      <style jsx>
        {`
        .player-container {
          position: fixed;
          top: 0;
          left: 0;
          width:100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          z-index: 999999;
          display: block;
        }

          .player-wrapper {
            position: absolute;
            width: 90%;
            height: 90%;
            top:50%;
            left:50%;
            transform: translate(-50%,-50%);
          }

        #player-display {
          background: white;
          position: absolute;
          transform-origin: 0 0;
          left: 50%;
          top: 50%;
        }

      `}
      </style>
      <style jsx global>
        {`
        iframe {
          border: none;
          pointer-events: none;
        }
      `}
      </style>
    </div>
  );
};

Player.propTypes = {
  handleOutsideClick: PropTypes.func.isRequired,
  replay: PropTypes.shape({
    events: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
};

export default Player;
