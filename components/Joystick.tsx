import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

interface JoystickProps {
    onMove: (data: { x: number; y: number; angle: number }) => void;
    onStop: () => void;
    size?: number;
    color?: string;
}

export default function Joystick({
    onMove,
    onStop,
    size = 150,
    color = 'rgba(255, 255, 255, 0.5)',
}: JoystickProps) {
    const knobSize = size / 2.5;
    const maxRange = size / 2 - knobSize / 2;

    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const context = useSharedValue({ x: 0, y: 0 });

    const panGesture = Gesture.Pan()
        .onStart(() => {
            context.value = { x: translateX.value, y: translateY.value };
        })
        .onUpdate((event) => {
            let x = context.value.x + event.translationX;
            let y = context.value.y + event.translationY;

            const dist = Math.sqrt(x * x + y * y);
            if (dist > maxRange) {
                const angle = Math.atan2(y, x);
                x = Math.cos(angle) * maxRange;
                y = Math.sin(angle) * maxRange;
            }

            translateX.value = x;
            translateY.value = y;

            if (dist > 10) { // Deadzone
                const angle = Math.atan2(y, x);
                const normX = x / maxRange;
                const normY = y / maxRange;
                runOnJS(onMove)({ x: normX, y: normY, angle });
            } else {
                runOnJS(onMove)({ x: 0, y: 0, angle: 0 });
            }
        })
        .onEnd(() => {
            translateX.value = withSpring(0);
            translateY.value = withSpring(0);
            runOnJS(onStop)();
        });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
            ],
        };
    });

    return (
        <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.knob, { width: knobSize, height: knobSize, borderRadius: knobSize / 2, backgroundColor: color }, animatedStyle]} />
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    knob: {
        position: 'absolute',
    },
});
