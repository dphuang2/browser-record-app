import {
  useRef, useEffect, useState,
} from 'react';

import PropTypes from 'prop-types';
import { Replayer } from 'rrweb';
import 'rrweb/dist/rrweb.min.css';

const MARKER_SIZE = 13;
const PROGRESS_BAR_HEIGHT = 5;
const CONTROLS_HEIGHT = 35;
const PROGRESS_COLOR = '#f00';
const PROGRESS_BAR_BACKGROUND = 'rgba(255,255,255,.2)';
const STYLESHEET_TIMEOUT_DURATION = 3000; // 3 seconds to allow for stylesheets to load
const PRECISION_OFFSET = 5;
const PLAYER_OVERLAY_ANIMATION = 'fade 0.3s linear';
const REPLAY_WATCHED_THRESHOLD = 0.995;
const TOUCH_EVENTS = ['touchstart', 'touchmove', 'touchend'];
const MOUSE_EVENTS = ['mousedown', 'mousemove', 'mouseup'];

let animationFrameGlobalId;

const Player = ({ replay, handleOutsideClick }) => {
  const displayerRef = useRef();
  const displayerWrapperRef = useRef();
  const controllerRef = useRef();
  const progressBarRef = useRef();
  const pauseOverlayRef = useRef();
  const playOverlayRef = useRef();
  const playPauseButtonRef = useRef();
  const replayer = useRef();
  const localPlaying = useRef();
  const lastPlayedTime = useRef();
  const totalTime = useRef(0);
  const shouldUpdate = useRef(true);
  const wasPlaying = useRef(true);
  const currentlyScrubbing = useRef(false);
  const lastMarkerPosition = useRef(0);
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

  const handleMarkerStart = (event) => {
    wasPlaying.current = playing;
    setPlayingWrapper(false);
    shouldUpdate.current = false;
    currentlyScrubbing.current = true;
    updateReplayer(event);
    event.preventDefault();
    event.stopPropagation();
  }

  const playAt = (newTime) => {
    try {
      replayer.current.play(newTime);
    } catch(error) {
      return false;
    }
    return true;
  }

  const updateReplayer = (event) => {
    const { width } = progressBarRef.current.getBoundingClientRect();
    const newMarkerPosition = calculateMarkerPosition(event);
    const newPercentageWatched = newMarkerPosition / width;
    playAt(newPercentageWatched * totalTime.current);
    setMarkerPosition(newMarkerPosition)
    setCurrentTime(newPercentageWatched * totalTime.current);
    replayer.current.pause();
  }

  const calculateMarkerPosition = (event) => {
    event.preventDefault()
    // Get distance from left of screen for progress bar
    const { left, width } = progressBarRef.current.getBoundingClientRect();
    // Use distance and offset from left of window to calculate marker position
    const equalsEvent = (element) => { return element == event.type };
    if (TOUCH_EVENTS.find(equalsEvent) && event.touches) {
      if (event.touches.length >= 1)
        lastMarkerPosition.current = clamp(event.touches[0].clientX - left, 0, width);
    } else if (MOUSE_EVENTS.find(equalsEvent))
      lastMarkerPosition.current = clamp(event.clientX - left, 0, width);
    return lastMarkerPosition.current;
  }

  const handleMousemove = (event) => {
    if (currentlyScrubbing.current) {
      setMarkerPosition(calculateMarkerPosition(event));
      event.preventDefault();
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

  const togglePlay = () => {
      if (!localPlaying.current) {
        setPlayingWrapper(true);
      } else {
        setPlayingWrapper(false);
      } 
  }

  const setPlayingWrapper = (playing) => {
    if (playing) {
      setPlaying(true)
      playPauseButtonRef.current.setAttribute('style', '');
    } else {
      setPlaying(false);
      playPauseButtonRef.current.setAttribute(
        'style',
        `border-style: solid; border-width: ${CONTROLS_HEIGHT / 2}px 0 ${CONTROLS_HEIGHT / 2}px ${CONTROLS_HEIGHT * .81}px;`
      );
    }
  }

  const handleMarkerStop = (event) => {
    if (currentlyScrubbing.current) {
      updateReplayer(event);
      setPlayingWrapper(wasPlaying.current);
      shouldUpdate.current = true;
      currentlyScrubbing.current = false;
    }
    window.focus();
    event.preventDefault();
  }

  // Reflect percentage watched on the controller from displayer
  useEffect(() => {
    handleNewPercentageWatchedOrResize();
    setCurrentTime(percentageWatched * totalTime.current);
    if (percentageWatched >= REPLAY_WATCHED_THRESHOLD) {
      setPlayingWrapper(false);
    } 
  }, [percentageWatched]);

  useEffect(() => {
    const setAvailableDimensions = () => {
      if (!displayerWrapperRef || !displayerWrapperRef.current) return;
      const { width, height } = displayerWrapperRef.current.getBoundingClientRect();
      setAvailableWidth(width);
      setAvailableHeight(height);
    };

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
    playAt();
    window.addEventListener('resize', setAvailableDimensions);
    window.addEventListener('resize', handleNewPercentageWatchedOrResize);
    document.body.classList.add('stop-scrolling');

    return () => {
      window.removeEventListener('resize', setAvailableDimensions);
      window.removeEventListener('resize', handleNewPercentageWatchedOrResize);
      document.body.classList.remove('stop-scrolling');

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
      if (percentageWatched >= REPLAY_WATCHED_THRESHOLD) {
        playAt(0);
      }
      else {
        if (lastPlayedTime.current !== undefined &&
          lastPlayedTime.current <= replayer.current.getCurrentTime()) {
          replayer.current.resume(replayer.current.getCurrentTime());
        } else {
          playAt(replayer.current.getCurrentTime());
        }
      }
      animationFrameGlobalId = window.requestAnimationFrame(updatePercentageWatched)
      localPlaying.current = true;
      playOverlayRef.current.style.animation = PLAYER_OVERLAY_ANIMATION;
      pauseOverlayRef.current.style.animation = '';
    } else {
      lastPlayedTime.current = replayer.current.getCurrentTime();
      replayer.current.pause();
      localPlaying.current = false;
      playOverlayRef.current.style.animation = '';
      pauseOverlayRef.current.style.animation = PLAYER_OVERLAY_ANIMATION;
    }
  }, [playing])

  return (
    <div
      role="presentation"
      className="player-container"
      onMouseMove={handleMousemove}
      onTouchMove={handleMousemove}
      onMouseUp={handleMarkerStop}
      onTouchEnd={handleMarkerStop}
    >
      <div
        role="presentation"
        className="close" 
        onClick={handleOutsideClick}
      />
      <div 
        ref={displayerWrapperRef}
        className="wrapper"
      >
        <div
          role="presentation"
          className="display"
          ref={displayerRef}
          onClick={togglePlay}
        >
          <div ref={pauseOverlayRef} className="pause-overlay" />
          <div ref={playOverlayRef} className="play-overlay" />
        </div>
      </div>
      <div
        ref={controllerRef}
        className="controller"
      >
        <div
          className="progress-bar-wrapper"
        >
          <div
            role="button"
            tabIndex="0"
            className="progress-bar-padding"
            onMouseEnter={handleFocus}
            onMouseLeave={handleDefocus}
            onMouseDown={handleMarkerStart}
            onTouchStart={handleMarkerStart}
          />
          <div ref={progressBarRef} className="progress-bar">
            <div className="marker-wrapper">
              <div className={focused || currentlyScrubbing.current ? 'marker focused-marker' : 'marker'} />
            </div>
            <div className="play-progress" />
          </div>
        </div>
        <div className="controls">
          <div className="playpause-button-wrapper">
            <button 
              type="button"
              ref={playPauseButtonRef}
              className='playpause-button'
              onClick={togglePlay} 
            />
          </div>
          <span className="time-display">
            {millisecondsToMinutes(currentTime)}
            {':'}
            {millisecondsToSeconds(currentTime)}
            {' / '}
            {millisecondsToMinutes(totalTime.current)}
            {':'}
            {millisecondsToSeconds(totalTime.current)}
          </span>
        </div>
      </div>
      <style jsx global>
        {`
          @keyframes fade {
            0%,100% { opacity: 0 }
            25% { opacity: 1 }
          }

          .stop-scrolling {
            height: 100%;
            overflow: hidden;
          }

          .replayer-wrapper iframe {
            border: none;
            background: white;
          }
        `}
      </style>
      <style jsx>
        {`
          .playpause-button {
            border: 0;
            background: transparent;
            box-sizing: border-box;
            width: 0;
            height: ${CONTROLS_HEIGHT}px;
            border-color: transparent transparent transparent rgb(238, 238, 238);
            transition: 100ms all ease;
            cursor: pointer;
            border-style: double;
            border-width: 0px 0 0px ${CONTROLS_HEIGHT * .81}px;
            opacity: .8;
            padding: 0;
            grid-area: playpause;
          }
          .playpause-button-wrapper {
            height: ${CONTROLS_HEIGHT}px;
            display: inline-block;
            padding: 0 5px;
            width: ${CONTROLS_HEIGHT}px;
          }
          .playpause-button:hover {
            border-color: transparent transparent transparent rgb(238, 238, 238);
            opacity: 1;
          }
          .play-overlay {
            background: transparent;
            box-sizing: border-box;
            width: 0;
            height: 100px;
            border-color: transparent transparent transparent #000000b0;
            cursor: pointer;
            z-index: 9999;
            border-style: solid;
            border-width: 50px 0 50px 80px;
            position: absolute;
            top: 50%;
            left: 50%;
            opacity: 0;
            transform: translate(-50%, -50%);
          }

          .pause-overlay {
            background: transparent;
            box-sizing: border-box;
            width: 0;
            height: 100px;
            border-color: #000000b0;
            cursor: pointer;
            z-index: 9999;
            border-style: double;
            border-width: 0px 0 0px 80px;
            position: absolute;
            top: 50%;
            left: 50%;
            opacity: 0;
            transform: translate(-50%, -50%);
          }

          .player-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
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
            position: fixed;
            transform-origin: 0 0;
            left: 50%;
            transform: translate(-${50 * scale}%, -${50 * scale}%) scale(${scale});
            top: 50%;
            line-height: 100%;
            cursor: pointer;
          }

          .controls {
            width: auto;
            position: absolute;
            bottom: calc((100% - ${PROGRESS_BAR_HEIGHT}px) / 2);
            left: 50%;
            height: ${CONTROLS_HEIGHT}px;
            transform: translate(-50%, 50%);
            display: grid;
            grid-gap: 20px;
            grid-template-columns: repeat(1, 2fr);
            grid-template-areas: "playpause time"
          }

          .time-display {
            color:white;
            grid-area: time;
            line-height: ${CONTROLS_HEIGHT}px;
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
            z-index: 1000;
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

          .close {
            z-index: 99999;
            position: absolute;
            left: 16px;
            top: 16px;
            width: 32px;
            height: 32px;
            opacity: 0.6;
          }

          .close:hover {
            opacity: 1;
          }

          .close:before, .close:after {
            position: absolute;
            left: 15px;
            content: ' ';
            height: 33px;
            width: 4px;
            background-color: white;
            border: 1px solid black;
          }

          .close:before {
            transform: rotate(45deg);
          }

          .close:after {
            transform: rotate(-45deg);
          }
          .Polaris-Connected__Item--connection:first-child {
            border-top-right-radius: 3px;
            border-bottom-right-radius: 3px;
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
