/**
 * TouchCameraControl - Touch area for camera rotation
 * Covers ENTIRE screen - joystick overlay handles its own touch events
 * Any drag that isn't on the joystick rotates the camera
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';

const TouchCameraControl = ({ 
    onRotate, 
    sensitivity = 0.3
}) => {
    const [touchId, setTouchId] = useState(null);
    const lastPosRef = useRef({ x: 0, y: 0 });
    
    const handleTouchStart = useCallback((e) => {
        // Only handle touches that aren't already being tracked
        if (touchId !== null) return;
        
        for (const touch of e.changedTouches) {
            // Check if touch is on a UI element (buttons, joystick, etc.)
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target) {
                // Skip if touching a button, joystick, or other interactive element
                const isInteractive = target.closest('button') || 
                                     target.closest('[data-joystick]') ||
                                     target.closest('[data-no-camera]') ||
                                     target.tagName === 'INPUT' ||
                                     target.tagName === 'BUTTON';
                if (isInteractive) continue;
            }
            
            setTouchId(touch.identifier);
            lastPosRef.current = { x: touch.clientX, y: touch.clientY };
            break;
        }
    }, [touchId]);
    
    const handleTouchMove = useCallback((e) => {
        if (touchId === null) return;
        
        for (const touch of e.changedTouches) {
            if (touch.identifier === touchId) {
                const deltaX = (touch.clientX - lastPosRef.current.x) * sensitivity;
                const deltaY = (touch.clientY - lastPosRef.current.y) * sensitivity;
                
                lastPosRef.current = { x: touch.clientX, y: touch.clientY };
                
                if (onRotate) {
                    onRotate({ deltaX, deltaY });
                }
                break;
            }
        }
    }, [touchId, sensitivity, onRotate]);
    
    const handleTouchEnd = useCallback((e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === touchId) {
                setTouchId(null);
                break;
            }
        }
    }, [touchId]);
    
    useEffect(() => {
        // Listen on document for full screen coverage
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        document.addEventListener('touchcancel', handleTouchEnd, { passive: true });
        
        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
    
    // This component doesn't render anything visible - it just handles touch events
    return null;
};

export default TouchCameraControl;

