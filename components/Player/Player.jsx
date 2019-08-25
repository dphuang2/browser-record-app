import {
  useRef, useEffect, useState,
} from 'react';

import PropTypes from 'prop-types';
import { Replayer } from 'rrweb';
import 'rrweb/dist/rrweb.min.css';

const MARKER_SIZE = 13;
const PROGRESS_BAR_HEIGHT = 5;
const PROGRESS_COLOR = '#f00';
const PROGRESS_BAR_BACKGROUND = 'rgba(255,255,255,.2)';
const STYLESHEET_TIMEOUT_DURATION = 3000; // 3 seconds to allow for stylesheets to load
const PRECISION_OFFSET = 5;

let animationFrameGlobalId;

const Player = ({ replay, handleOutsideClick }) => {
  const displayerRef = useRef();
  const displayerWrapperRef = useRef();
  const controllerRef = useRef();
  const progressBarRef = useRef();
  const replayer = useRef();
  const localPlaying = useRef();
  const lastPlayedTime = useRef();
  const totalTime = useRef();
  const shouldUpdate = useRef(true);
  const wasPlaying = useRef(true);
  const currentlyScrubbing = useRef(false);
  const [scale, setScale] = useState();
  const [availableWidth, setAvailableWidth] = useState();
  const [availableHeight, setAvailableHeight] = useState();
  const [contentWidth, setContentWidth] = useState();
  const [contentHeight, setContentHeight] = useState();
  const [percentageWatched, setPercentageWatched] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [markerPosition, setMarkerPosition] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [focused, setFocused] = useState(false);

  /*
  *We want to make sure that the playing state changes while dragging
  */
  const handleMarkerStart = () => {
    wasPlaying.current = playing;
    setPlaying(false);
    shouldUpdate.current = false;
    currentlyScrubbing.current = true;
  }

  const calculateMarkerPosition = (event) => {
    // Get distance from left of screen for progress bar
    const { left, width } = progressBarRef.current.getBoundingClientRect();
    // Use distance and offset from left of window to calculate marker position
    return clamp(event.clientX - left, 0, width);
  }

  /*
  *For progress bar width update
  */
  const handleMousemove = (event) => {
    if (currentlyScrubbing.current) {
      setMarkerPosition(calculateMarkerPosition(event));
    }
  }

  const handleFocus = () => {
    setFocused(true);
  }

  const handleDefocus = () => {
    setFocused(false);
  }

  const handleNewPercentageWatchedOrResize = () => {
    if (!shouldUpdate.current) return;
    const { width } = progressBarRef.current.getBoundingClientRect();
    setMarkerPosition(clamp(percentageWatched, 0, 1.0) * width);
  }

  const handlePlayButtonClick = (event) => {
    setPlaying(event.target.checked);
  }

  const clamp = (x, min, max) => {
    return Math.min(Math.max(x, min), max);
  }

  const twoPad = (x) => {
    return ("00" + x).substr(-2);
  }

  const millisecondsToMinutes = (milliseconds) => {
    return twoPad(Math.floor((milliseconds / 1000) / 60));
  }

  const millisecondsToSeconds = (milliseconds) => {
    return twoPad(Math.floor((milliseconds / 1000) % 60));
  }

  const updatePercentageWatched = () => {
    if (localPlaying.current) {
      if (replayer.current) {
        const currentTime = replayer.current.getCurrentTime();
        setPercentageWatched((currentTime / totalTime.current));
        if (currentTime < totalTime.current) animationFrameGlobalId = window.requestAnimationFrame(updatePercentageWatched);
      } else {
        animationFrameGlobalId = window.requestAnimationFrame(updatePercentageWatched)
      }
    }
  }

  // Reflect percentage watched on the controller from displayer
  useEffect(() => {
    handleNewPercentageWatchedOrResize();
    setCurrentTime(percentageWatched * totalTime.current);
    if (percentageWatched >= 1) setPlaying(false);
  }, [percentageWatched]);

  useEffect(() => {
    const setAvailableDimensions = () => {
      if (!displayerWrapperRef || !displayerWrapperRef.current) return;
      const { width, height } = displayerWrapperRef.current.getBoundingClientRect();
      setAvailableWidth(width);
      setAvailableHeight(height);
    };
    const handleMarkerStop = (event) => {
      if (currentlyScrubbing.current) {
        const { width } = progressBarRef.current.getBoundingClientRect();
        const newMarkerPosition = calculateMarkerPosition(event);
        const newPercentageWatched = newMarkerPosition / width;
        replayer.current.play(newPercentageWatched * totalTime.current);
        replayer.current.pause();
        setCurrentTime(newPercentageWatched * totalTime.current);
        setMarkerPosition(newMarkerPosition);
        setPlaying(wasPlaying.current);
        shouldUpdate.current = true;
        currentlyScrubbing.current = false;
      }
    }
    replayer.current = new Replayer(replay.events, {
      root: displayerRef.current,
      loadTimeout: STYLESHEET_TIMEOUT_DURATION,
      skipInactive: true,
    })
    totalTime.current = replayer.current.getMetaData().totalTime;
    replayer.current.on('resize', (event) => {
      setContentWidth(event.width);
      setContentHeight(event.height);
      setAvailableDimensions();
    });
    replayer.current.play();
    window.addEventListener('resize', setAvailableDimensions);
    window.addEventListener('resize', handleNewPercentageWatchedOrResize);
    window.addEventListener('mousemove', handleMousemove);
    window.addEventListener('mouseup', handleMarkerStop);
    return () => {
      window.removeEventListener('resize', handleNewPercentageWatchedOrResize);
      window.removeEventListener('mousemove', handleMousemove);
      window.removeEventListener('mouseup', handleMarkerStop);
      window.removeEventListener('resize', setAvailableDimensions);
      window.cancelAnimationFrame(animationFrameGlobalId);
      replayer.current.timer.clear();
    };
  }, [])

  useEffect(() => {
    // Scale iframe wrapper based on available width/height and content
    // width/height. Also account for browser lack of precision for transform
    // CSS property by decreasing available width and height.
    setScale(Math.min(
      (availableWidth - PRECISION_OFFSET) / contentWidth,
      (availableHeight - PRECISION_OFFSET) / contentHeight,
    ));
  }, [availableWidth, availableHeight, contentWidth, contentHeight]);

  useEffect(() => {
    if (playing) {
      if (percentageWatched >= 0.99) replayer.current.play(0);
      else {
        if (lastPlayedTime.current !== undefined &&
          lastPlayedTime.current <= replayer.current.getCurrentTime()) {
          replayer.current.resume(replayer.current.getCurrentTime());
        } else {
          replayer.current.play(replayer.current.getCurrentTime());
        }
      }
      animationFrameGlobalId = window.requestAnimationFrame(updatePercentageWatched)
      localPlaying.current = true;
    } else {
      lastPlayedTime.current = replayer.current.getCurrentTime();
      replayer.current.pause();
      localPlaying.current = false;
    }
  }, [playing])

  const handleClick = (event) => {
    if (
      (displayerRef
        && displayerRef.current
        && displayerRef.current.contains(event.target))
      || (controllerRef
        && controllerRef.current
        && controllerRef.current.contains(event.target))
    ) return;

    handleOutsideClick();
  };

  return (
    <div
      className="player-container"
      onClick={handleClick}
      role="presentation"
    >
      <div ref={displayerWrapperRef} className="wrapper">
        <div
          className="display"
          ref={displayerRef}
        />
      </div>
      <div
        ref={controllerRef}
        className="controller"
      >
        <div
          className="progress-bar-wrapper"
        >
          <div
            role="presentation"
            className="progress-bar-padding"
            onMouseEnter={handleFocus}
            onMouseLeave={handleDefocus}
            onMouseDown={handleMarkerStart}
          />
          <div ref={progressBarRef} className="progress-bar">
            <div className="marker-wrapper">
              <div className={focused ? 'marker focused-marker' : 'marker'} />
            </div>
            <div className="play-progress" />
          </div>
        </div>
        <div className="controls">
          <span className="time-display">
            {millisecondsToMinutes(currentTime)}
            {':'}
            {millisecondsToSeconds(currentTime)}
            {' / '}
            {millisecondsToMinutes(totalTime.current)}
            {':'}
            {millisecondsToSeconds(totalTime.current)}
          </span>
          <input type="checkbox" checked={playing} onChange={handlePlayButtonClick} />
        </div>
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
          
          .wrapper {
            position: fixed;
            width: 90%;
            height: 90%;
            top: 45%;
            left: 50%;
            transform: translate(-50%,-50%);
          }
          .display {
            background: white;
            position: fixed;
            transform-origin: 0 0;
            left: 50%;
            transform: translate(-${50 * scale}%, -${50 * scale}%) scale(${scale});
            top: 50%;
          }
          .controls {
            width: auto;
            position: absolute;
            bottom: calc((100% - ${PROGRESS_BAR_HEIGHT}px) / 2);
            left: 50%;
            transform: translate(-50%, 50%);
          }
          
          .time-display {
            color:white;
          }
          
          .controller {
            position: fixed;
            bottom: 0;
            width: 100%;
            height: 10%;
            background: rgba(0, 0, 0, 0.3);
            display: block;
            z-index: 999;
          }
          
          .progress-bar-padding {
            height: 16px;
            bottom: 0;
            width: 100%;
            position: absolute;
            z-index: 998;
          }
          
          .progress-bar-wrapper {
            width: calc(100% - 50px);
            height: ${PROGRESS_BAR_HEIGHT}px;
            top: 0px;
            
            position: absolute;
            left: 50%;
            transform: translate(-50%, 0);
          }
          
          .progress-bar {
            width: calc(100% - ${MARKER_SIZE}px);
            height: 100%;
            background: ${PROGRESS_BAR_BACKGROUND};
            
            position: absolute;
            left: 50%;
            transform: translate(-50%, 0);
          }
          
          .play-progress {
            width: ${markerPosition}px;
            height: 100%;
            background: ${PROGRESS_COLOR};
            position: absolute;
            left: 0;
          }
          
          .marker-wrapper {
            position: absolute;
            width: ${MARKER_SIZE};
            height: ${MARKER_SIZE};
            left: calc(${markerPosition}px - ${MARKER_SIZE / 2}px);
          }
          
          .marker {
            background: ${PROGRESS_COLOR};
            position: absolute;
            top: -${(MARKER_SIZE - PROGRESS_BAR_HEIGHT) / 2}px;
            width: ${MARKER_SIZE}px;
            height: ${MARKER_SIZE}px;
            border-radius: ${MARKER_SIZE / 2}px;
            transition: all .1s cubic-bezier(0.4,0.0,1,1);
            transform: scale(0);
          }
          
          .focused-marker {
            transform: scale(1);
          }
          
              `}
      </style>
      <style jsx global>
        {`
              iframe {
                border: none;
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
