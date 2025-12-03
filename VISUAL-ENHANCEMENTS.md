# Visual Polish Enhancement Examples

Quick reference for using the enhanced Dark Navy + Peach theme features.

## 🎨 Sophisticated Gradients

```tsx
// Aurora gradient background
<div className="bg-gradient-aurora p-8 rounded-lg">
  Content with aurora effect
</div>

// Mesh gradient (multi-layered radial gradients)
<div className="bg-gradient-mesh min-h-screen">
  Full page mesh background
</div>

// Animated gradient
<div className="bg-gradient-animated p-6 rounded-lg">
  Smoothly shifting colors
</div>

// Peach glow gradient
<button className="bg-gradient-peach-glow px-6 py-3 rounded-lg">
  Glowing Button
</button>
```

## 🔮 Glassmorphism

```tsx
// Basic glass effect
<div className="glass p-6 rounded-lg">
  <h3>Glass Card</h3>
  <p>Frosted glass effect with blur</p>
</div>

// Pre-styled glass card
<div className="glass-card">
  Ready-to-use glass card
</div>

// Strong glass (more opaque)
<div className="glass-strong p-6 rounded-lg">
  Stronger frosted effect
</div>

// Subtle glass (very transparent)
<div className="glass-subtle p-6 rounded-lg">
  Barely-there glass effect
</div>
```

## ✨ Enhanced Buttons

```tsx
// Button with micro-animations
<button className="btn-enhanced bg-primary text-primary-foreground px-6 py-3 rounded-lg">
  Hover & Click Me
</button>

// Shimmer effect
<button className="btn-shimmer bg-primary px-6 py-3 rounded-lg">
  Shimmer Button
</button>

// Glow on hover
<button className="btn-glow bg-peach-500 text-navy-900 px-6 py-3 rounded-lg">
  Glow Button
</button>

// Pulse animation
<button className="btn-pulse bg-primary px-6 py-3 rounded-lg">
  Pulsing CTA
</button>
```

## 🎴 Card Hover Effects

```tsx
// Lift on hover
<div className="card-hover bg-card p-6 rounded-lg shadow-lg">
  Lifts slightly on hover
</div>

// Dramatic lift with scale
<div className="card-hover-lift bg-card p-6 rounded-lg shadow-lg">
  Lifts higher with scale
</div>

// Glow effect
<div className="card-glow bg-card p-6 rounded-lg shadow-lg">
  Glows on hover
</div>

// 3D tilt effect
<div className="card-tilt bg-card p-6 rounded-lg shadow-lg">
  Tilts in 3D on hover
</div>
```

## 🌟 Enhanced Shadows

```tsx
// Peach-colored shadow
<div className="shadow-peach bg-card p-6 rounded-lg">
  Peach shadow
</div>

// Large peach shadow
<div className="shadow-peach-lg bg-card p-6 rounded-lg">
  Larger peach shadow
</div>

// Glass shadow (inset + drop shadow)
<div className="shadow-glass bg-card p-6 rounded-lg">
  Glassmorphism shadow
</div>

// Layered depth shadow
<div className="shadow-depth bg-card p-6 rounded-lg">
  Multi-layer depth
</div>

// Glow shadow
<div className="shadow-glow-peach bg-card p-6 rounded-lg">
  Glowing peach aura
</div>
```

## 📊 Elevation System

```tsx
// Different elevation levels (1-5)
<div className="elevation-1 bg-card p-4 rounded-lg">Level 1</div>
<div className="elevation-2 bg-card p-4 rounded-lg">Level 2</div>
<div className="elevation-3 bg-card p-4 rounded-lg">Level 3</div>
<div className="elevation-4 bg-card p-4 rounded-lg">Level 4</div>
<div className="elevation-5 bg-card p-4 rounded-lg">Level 5</div>
```

## 💫 Glow Effects

```tsx
// Peach glow
<div className="glow-peach bg-navy-900 p-6 rounded-lg">
  Subtle peach glow
</div>

// Strong peach glow
<div className="glow-peach-strong bg-navy-900 p-6 rounded-lg">
  Strong double glow
</div>

// Text glow
<h1 className="text-glow-peach text-4xl font-bold">
  Glowing Text
</h1>

// Animated border glow
<div className="border-glow bg-navy-900 p-6 rounded-lg">
  Rotating border glow
</div>
```

## 🎭 Animations

```tsx
// Floating animation
<div className="animate-float bg-card p-6 rounded-lg">
  Gently floating
</div>

// Slow float
<div className="animate-float-slow">Slow float</div>

// Fast float
<div className="animate-float-fast">Fast float</div>
```

## 🌫️ Backdrop Blur

```tsx
// Various blur levels
<div className="backdrop-blur-sm">Small blur</div>
<div className="backdrop-blur">Default blur</div>
<div className="backdrop-blur-md">Medium blur</div>
<div className="backdrop-blur-lg">Large blur</div>
<div className="backdrop-blur-xl">Extra large blur</div>
```

## 🎯 Complete Example

```tsx
function EnhancedCard() {
  return (
    <div className="glass-card card-hover-lift shadow-peach-lg">
      <div className="bg-gradient-aurora p-1 rounded-t-lg -m-6 mb-4">
        <div className="bg-navy-900 p-4 rounded-t-lg">
          <h3 className="text-xl font-bold text-glow-peach">
            Enhanced Card
          </h3>
        </div>
      </div>
      
      <p className="text-muted-foreground mb-4">
        This card combines multiple enhancements:
        glass effect, hover lift, peach shadow, and aurora gradient header.
      </p>
      
      <button className="btn-enhanced btn-glow bg-gradient-peach-glow text-navy-900 px-6 py-3 rounded-lg font-medium w-full">
        Enhanced CTA
      </button>
    </div>
  );
}
```

## 🎨 Hero Section Example

```tsx
function HeroSection() {
  return (
    <section className="relative min-h-screen bg-navy-900 overflow-hidden">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-50" />
      
      {/* Floating elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-peach-500/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl animate-float-slow" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="glass-card max-w-2xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 text-glow-peach">
            Dark Navy + Peach
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Enhanced with sophisticated visual polish
          </p>
          <button className="btn-enhanced btn-shimmer bg-gradient-peach-glow text-navy-900 px-8 py-4 rounded-lg text-lg font-semibold shadow-peach-lg">
            Get Started

## 🎨 Extended Color Palette

### Navy Scale
Full range of navy shades for depth and hierarchy:
- `bg-navy-50` to `bg-navy-950`
- Use `navy-900` for main backgrounds
- Use `navy-800` for cards
- Use `navy-700` for elevated elements

### Peach Scale
Warm peach tones for accents and actions:
- `bg-peach-50` to `bg-peach-950`
- Use `peach-500` for primary actions
- Use `peach-300` for subtle highlights
- Use `peach-100` for backgrounds

### Complementary Accents
New accent colors that pair perfectly with Navy + Peach:
- `text-accent-teal` - Fresh, calming secondary accent
- `text-accent-gold` - Premium highlights
- `text-accent-purple` - Creative flair

## ✍️ Typography

### Font Families
- **Headings**: `font-heading` (Outfit) - Modern, geometric, friendly
- **Body**: `font-sans` (Plus Jakarta Sans) - Clean, legible, contemporary

### Usage
```tsx
<h1 className="font-heading text-4xl font-bold text-peach-500">
  Modern Heading
</h1>
<p className="font-sans text-muted-foreground">
  Clean body text using Plus Jakarta Sans for optimal readability.
</p>

## 🍑 Vibrant Peach & Sharp Contrast

### Vibrant Peach
A more saturated peach for high-impact elements:
- `bg-peach-vibrant` - Intense peach background
- `text-peach-vibrant` - High-visibility text
- `btn-vibrant` - High-impact CTA button

### Sharp Lining (High Contrast)
Add crisp white borders for distinct separation against dark backgrounds:
- `border-sharp` - Semi-transparent white border
- `border-sharp-full` - Pure white border
- `card-sharp` - Card with crisp white outline
- `divider-sharp` - High-contrast divider

### Usage
```tsx
// High contrast card with vibrant button
<div className="card-sharp p-6 rounded-lg">
  <h3 className="text-2xl font-bold text-white mb-4">Premium Plan</h3>
  <div className="divider-sharp" />
  <button className="btn-vibrant w-full py-3 rounded-lg">
    Upgrade Now
  </button>
</div>

// Sharp outlined button
<button className="btn-outline-sharp px-6 py-2 rounded-full">
  Learn More
</button>
```
