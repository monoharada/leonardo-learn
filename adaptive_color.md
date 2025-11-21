Adaptive Color in Design Systems

Nate Baldwin
Follow
7 min read
·
May 31, 2019
904

3



Part one of a three-part series exploring a new approach to creating accessible and perceptually adaptive color palettes in design systems.
Press enter or click to view image in full size


Cropped view of Runge Farbenkugel by Philipp Otto Runge [Public domain]
So, you’re creating a design system for your company. Your team is furiously working to conceive, build, and audit a system of components and design principles.
As you think about your product’s interface, choosing a color palette is one of the first things you’ll do. If you’re following best practices, you are likely conforming to Web Content Accessibility Guidelines (WCAG). These guidelines define minimum contrast ratios to ensure legibility of content in web interfaces. If you’re not already following WCAG standards, you may find that certain content or UI elements are difficult for some of your users to see. Regardless, the issue of color contrast is an inevitable part of choosing a color palette in a design system.
But creating a harmonious color palette that conforms to contrast standards is complicated. You may start by choosing a color palette, then apply the colors to UI elements for context and readjust the colors until they are the best selection for your product. An adjustment to any one of a color’s properties will result in a different contrast ratio, so as you refine your color selections, you need to continually recheck the contrast.
Press enter or click to view image in full size


Often, in the future, you will have to modify or add to your color palette to meet new requirements — this could be anything from allowing alternate background colors for components to creating a new theme entirely (such as to utilize Apple or Android Dark Modes). These scenarios may require you to make adjustments to color that meet your product aesthetic while conforming to standard contrast ratios.
Throughout this process, you may find that adjustments to one color diminish its harmony with the other colors in the palette. This requires that you either readjust the color again or alter your entire palette to conform to the outcome of your restraints.
This back-and-forth audit and refine process is tedious — all to simply choose a color palette that can meet accessibility requirements. It’s enough of a complex issue that new products and tools keep popping up, offering new ways to help address the problem. Each of these tools improves our experience and moves us closer to the solution, but they all fall short of solving the overarching issue.
Allow me to share some ideas about adaptable color systems that we have implemented in Spectrum, our Design System at Adobe, including how these concepts relate to the broader base of users working with color in user interfaces.
Glossary of Terms:
When approaching a color system, it helps to have a solid set of terms (and definitions) used by your team, for the sake of clarity:


Color: A single output comprised of all values for each color channel.
Color Family: A spectrum of tints, shades, and tones for any given color.
Color Palette: A group of color families.
Theme: A color palette with the context of an environment.
Note: These definitions are intended to serve as a key within this article; they are not indicative of broader academic or industry naming standards for such objects or concepts.
The Current State of Color Selection
You’re probably familiar with existing color-selection tools. Many of them are simple HSB color pickers, with little to no aid regarding color relationships. Most of these tools don’t account for the perceptual nuances in color that need to be observed in a design system, nor do they provide any reference to evaluate the impact of color in various contexts. These nuances affect overall color choices, as well as decisions regarding tints and shades.
Some tools also lack the notion of relational aides, such as guides to colors of similar saturation or lightness that might facilitate selection of a consistent or familial color palette. At the end of the day, the existing color-selection tools are really geared toward picking color palettes to use in static media, or as initial reference points for an overall aesthetic theme, not for creating a full or adaptive color system.

A typical pattern for a color picker.
New tools are evolving
The good news is that color tools are getting better. Recent explorations in this space have yielded tools that make it easier to create a family of colors instead of just pick individuals. The benefit is that designers can create smooth transitions between the tints and shades of a color family, typically with adjustments to hue, saturation, and lightness. The tools also provide easy export options for engineering — something critical for UI design, ensuring that color choices are more directly integrated into the end products. Some of these new tools have nice features like interpolating values between color steps, using lines or cubic Bezier curves.

Tints and shades of a color family
Nothing Solves the Entire Problem
But these tools have pitfalls, as well. First of all, they’re working in the wrong color space. Many of these tools focus on the HSL model, which is a cylindrical representation of the RGB color space. Since it’s in RGB, color properties do not accurately reflect the way color is perceived, which results in unusual transitions in color (even in tools that expose options for smooth curves). While output needs to be restricted to the available gamut in the RGB space, color selection should never begin there.
Get Nate Baldwin’s stories in your inbox
Join Medium for free to get updates from this writer.

Subscribe

Smooth curves between properties in a color family is only useful if they are in the right color space.

Comparison of RGB colors of equal HSL luminosity values and their actual perceived luminance
Also, typically these tools only allow you to build out or modify a single color (or family) at a time, so you have no awareness of the other colors in your palette. Auditing your color selection to ensure the palette remains harmonious is a back-and-forth process. One such nuance is ensuring that the lighter tints of your color family accelerate or decelerate their saturation levels in a way that appears consistent across each color in your palette. Many times, you’ll find that one selection gets more or less saturated than another after the individual color’s modifications have been made. Tools can get us a set of good colors, but making them an excellent set of colors is difficult to do.
Press enter or click to view image in full size


Simplified workflow illustrating UI color selection process
These tools also offer no way to evaluate context for color selection, such as how colors appear in text or in relationship with the background colors used in your products. With contextual color relationships, your color choices may be very different. A color that might look nice on a white background can often seem oversaturated on a dark background. This sort of chromatic adaptation is behind many optical illusions (as with the infamous dress) and has an effect on color selection, as it alters our perception of the color we’re observing.

These tools fail at one feat many of them boast: choosing accessible colors. They still require designers to address accessibility in a post-color-selection auditing process, and nothing addresses the issue of colorblind-accessible color palettes. Sometimes a contrast auditing feature is part of the tool itself, but typically additional accessibility tools have to be used. And none of them truly addresses the intended application of a color — e.g., if it’s to be used for large or small text — as a determining factor in color selection.
Recap of common shortfalls:
Suboptimal color space
No contextual color assessment
Inability to holistically assess palette and value steps
Inability to adapt color depending on those surrounding
No accessibility-first approach
Fragmentation, necessitating manual processes
In short, we’re still working with a fragmented and incomplete tool set. For further reading on tools and processes for color selection in design systems, here are a few places to start:
Leonardo: an open source contrast-based color generator
The Ultimate UX Guide to Color Design
Designing Systematic Colors
Reproaching Color
Palette App
Color Review
Thankfully, design tools continue to evolve — the industry has realized UI and UX design is a systematic process based on variables, conditions, and logic. This is the environment we design for, so why doesn’t our color selection apply the same concepts?
We work in a world where relationships and context are part of everyday design decisions. What we need as design-systems designers is a variable, contextual approach to color selection that begins with accessibility.
In the next article, I will explore adaptive color palettes as a new systematic approach for designers to solve the problems and pitfalls of our existing toolset.

Introducing Adaptive Color Palettes

Nate Baldwin
Follow
6 min read
·
May 31, 2019
368

6



Part two of a three-part series exploring a new approach to creating accessible and perceptually adaptive color palettes in design systems.
Press enter or click to view image in full size


Cropped view of Runge Farbenkugel by Philipp Otto Runge [Public domain]
This is why we have created what I refer to as “adaptive color palettes.” These palettes follow a systematic approach, in which designers define constraints that inform the generation of colors, rather than creating static swatches. Colors are defined with respect to their perceptual requirements and relationships, and swatches are generated based on minimal user input.
Accessibility First
First and foremost, we need to set a target contrast ratio. Target ratios allow us to generate color based on the desired contrast, programmatically conforming to WCAG accessibility requirements. This is not as simple as setting a static value like 3:1. Experienced designers know the importance of having different contrast ratios based on background color, hue, and other contextual triggers. This is complex, but because effort is placed on authoring the system and not output artifacts, you can continue to tweak and tune the system as a whole — all the while maintaining control over contrast ratios, which are a huge part of accessibility.

Color selection is based on the intended end use in order to eliminate much of the accessibility auditing during the selection process. Once the designer creates a set of constraints that will define the color family, the next task is simply to choose the desired ratios and move on.
Color Constraints and Variables
There are certain aspects of color we need to control in order for it to appear as we intend. The best color space in which to express this concept is the Lightness-Hue-Chroma (LCH) space, since the leading attributes of color we think about as designers are hue and chroma (saturation). This is not to be confused with Hue-Saturation-Lightness (HSL), which is less representative of human perception. For more information on perceptually based color models, see the CIELAB color space and the CIECAM02 color model.


Comparing Yellow, Red, and Blue with equal Luminosity in LCH colorspace with perceived luminance
I haven’t forgotten about lightness, which we want to be our primary variable in color generation. Since accessible contrasts are based on the “relative luminance” of colors, lightness will need to be the primary variable in how we generate colors. To allow for this, we need to define color as a variable along the L axis. Working in LCH allows you to fully specify colors in a perceptually robust way, and to compare and adjust lightness — and effectively, the contrast ratios — directly.

Color spectrum
Now, as designers, we may want to specify hue and chroma shifts in a color for a given lightness. This allows manipulation of the intensity and/or temperature for lighter or darker variation of a color separately, providing more creative freedom and aesthetic choices. For example, as you lighten a blue color, you may wish to make the blue warmer so that the color lightens in a more pleasant way. Warming a blue as it becomes lighter reflects the observation of blue objects in our natural world, such as how the blue of the sky becomes warmer as it approaches the light source (the sun). Conversely, blue colors in nature become cooler as they darken, like the sky when night approaches. This practice is common in representative art, when trying to capture the interplay between light and objects in a more expressive way. Carrying this practice into color selection for user interfaces is a way designers are able to affect the perceived environment of their experiences.
Get Nate Baldwin’s stories in your inbox
Join Medium for free to get updates from this writer.

Subscribe

Defining color constraints based on lightness enables us to generate swatches of any lightness (or “relative luminance”) and ensure that the color reflects our aesthetic choice while conforming to a target contrast ratio.
Variability of Background
Color perception is affected by adjacent and surrounding color. For interface design, this primarily relates to the background color, or the overall “theme.”


Gray color appears different as shown in Munker-White’s Illusion
One example of this phenomenon is related to the perception of contrast between lighter and darker UI. While a color with a 3:1 contrast ratio may appear just fine in a light theme, the same color at 3:1 contrast ratio with a dark background does not appear to have sufficient contrast. In order to compensate for the perception of contrast, we may actually need the color to be a higher contrast ratio in order to appear uniform across both themes.

Same contrast ratio appears inconsistent

Contrast ratio adjusted to approximate consistent optical contrast
Similarly, a color’s saturation may need to be adjusted based on the brightness of the surrounding background. Looking at this example of fuchsia, we may feel like the saturation is appropriate; however, the same color on a dark background appears to be more saturated.

Same color appears to have different saturation depending on background
For these reasons, we need background color influence in how we generate color, as well. In some cases, this may mean that the brightness (lightness) of the background directly relates to the contrast ratio needed for a generated color (changes per theme); in other cases, it may mean the background color directly relates to target saturation or hue shifts for the color.

Saturation adjusted to render colors perceptually the same
Adaptability of Color
The final aspect of this new concept is that of adaptability. Since colors are defined as a set of constraints along the axis of lightness, which are also based upon the lightness of the background color, and the desired output of color is defined by a target contrast ratio with the background, what we end up with is a color palette that adapts based on broader environmental considerations.


360 degrees of adaptive color (gif)
This way of defining color makes it much easier to modify the specific colors in your design system by adjusting any number of variables. If a color is too dark, you can simply adjust the desired contrast ratio and the color will adjust within your preset constraints for hue and saturation. You can also adjust the saturation of colors more uniformly: In the past, adjusting a single color swatch’s saturation meant reevaluating all swatches comparatively in order to ensure the saturations of each color in the color family (as well as each color in your entire palette) appeared cohesive. Now, you can adjust the saturation with a clear curvature to its rate of change across the color family, and do so in a way that gives confidence in the choice/change relative to the entire system.
The ability to modify backgrounds as a universal color palette adjustment is another powerful adaptive aspect. Since the colors are based on contrast ratio, any adjustment to your background color will regenerate the rest of your palette accordingly. In practice, this could mean darkening or lightening existing color themes, or introducing entirely new themes. If the engine for this color generation is a service for your product, this can become a mechanism for end users to personalize their experiences of your product without violating design intent. This personalization ensures maximum legibility for end users, whether they are in direct sunlight, in a dark studio, or experiencing screen glare. As a designer, you can then rest assured that no matter how end users modify the presentation of color in the UI, it will conform to the constraints you have defined.

Endless themes with an Adaptive Color Palette (gif)
In my next article I will discuss how we’ve implemented an adaptive color palette in Adobe’s design system.

Adaptive Color in Spectrum, Adobe’s Design System

Nate Baldwin
Follow
4 min read
·
May 31, 2019
373

3



Part three of a three-part series exploring a new approach to creating accessible and perceptually adaptive color palettes in design systems.
Press enter or click to view image in full size


Adobe Spectrum color palette
*Updated based on the release of Leonardo, an open source tool for creating adaptive color palettes*
The entire concept of adaptive color palettes was derived from our experience solving for color in Adobe’s design system, Spectrum. At the time of this work, we supported six different color themes, all of which needed to appear aesthetically related, with similar perceptive contrast with the background colors, and to follow uniform guidelines for accessibility.
We started by generating our gray system based on target contrast ratios. It worked well, but when we tried to do the same for our colors, it got more complicated.

Grays generated by target contrast ratio
For color, we wanted to rely on the same methodology of determining which swatches can be used for large and small text (based on WCAG contrast guidelines). When simply generating swatches of the same contrast across each theme, we realized the problem was more complex. As I mention in my previous article, color perception is affected by adjacent and surrounding color, making color appear lower contrast in darker backgrounds even with consistent contrast. In order for color contrast to appear consistent across themes, the actual contrast ratios had to change depending on the brightness of the theme background.

Contrast ratio adjusted to approximate consistent optical contrast
We also recognized that some colors’ brightness is critical to its identifiability. For example, a dark yellow is no longer yellow. Because of this we concluded that certain colors cannot be used for text or graphical elements as they will not be able to meet the criteria of color contrast and retain its identifiable nature.

Yellow does not look yellow when it meets contrast requirements
In the end, we created a tool called Leonardo that generates all of our colors given these constraints and exceptions.
Leonardo
Leonardo began as a color-generation algorithm based on predefined constraints and variable target contrast ratios. The target ratios are determined by both the hue of the input color and the brightness of the input background color, allowing us to identify the proper contrast ratio for any color within our design system’s color palette and within any context of background color brightness. The dependency on the background color enables us to increase or decrease contrast ratios as needed.

Generating all colors by contrast based on variable background

360 degrees of color hue generated on white background
The tool allows us to pass any number of hue degrees for each UI color and one value for a background color, for each of our themes. When we include our categorical color palette, this comes to 13 unique values for us to maintain. We have 4 tints of each color and 11 shades of each background color, giving us an output of 59 swatches for any given theme. In terms of purely grayscale background colors, we’re able to generate 255 different themes (based upon brightness values), or 15,045 color swatches. We can, however, pass through colorized backgrounds and generate swatches that still conform to our defined contrast ratios. A conservative estimation of this capacity would be at least 2,676,240 possible color swatches (59 swatches for background themes across 360 degrees of hue for each of 126 brightnesses of the possible backgrounds, assuming half of the backgrounds won’t yield desirable contrast).
Get Nate Baldwin’s stories in your inbox
Join Medium for free to get updates from this writer.

Subscribe

Leonardo can also generate any color on the spectrum for any given theme, giving our team tremendous flexibility in future adaptations or modifications to our color palette and themes.
Open sourcing Leonardo
Since this article was originally written, we have begun rebuilding Leonardo using d3 as an open source tool. Our goal is to make the selection and generation of accessible contrasting colors easier for all designers and engineers in the industry.
Read about Leonardo
Visit Leonardo at leonardocolor.io
Contribute to Leonardo on GitHub
Final Thoughts
The designers and engineers working on Adobe’s design system are determined to make design-system authoring easier. Colors are just one of many challenges we need to solve for in this space.
What challenges do you and your team face when creating design systems? The design systems community continually influences and inspires our work, and we’d love to hear from you!

Colorimetry and the Cartography of Color
An introduction to these topics in relation to user interface design and design systems.

Nate Baldwin
Follow
9 min read
·
Nov 22, 2019
311

1




Color is an important aspect of design. The process of choosing a scale of colors has a very close relationship with color science. Color scales are a common method of creating color systems for user interfaces. Color scales help to create a standard color palette with flexibility for use in a variety of ways.
Press enter or click to view image in full size


Example of color scale for dark and light values of blue
In this article, I hope to shine some light on a basic topic of color science and how it relates to creating color scales.
Colorimetry
Colorimetry is the science of measuring and quantifying color and human perception (thanks, Wikipedia). In other words, it’s how we try to make sense of color and how we perceive it. I’ll take a high level look at this topic, however if you’re interested in a more scientific dive, check out this article from Chandler Abraham.
What we know about color is that it’s a result of the human eye responding to different wavelengths of light. And the visible color spectrum is only a fraction of those wavelengths.
Press enter or click to view image in full size


How we see color has more to do with the physiology of the human eye than it does of the properties of light. The human eye is comprised of cones and rods — each detect different wavelengths. Most people have three different types of cones, each with their own wavelength sensitivity; red, green, and blue. For some people, certain cones are missing or the wavelength sensitivity is anomalous and skewed. These are called color vision deficiencies; a great place to learn more about this is at color-blindness.com.
Press enter or click to view image in full size


Recreated image with example of cone sensitivities in normal vision plus deuteranomaly
The trichromatic color theory is the theory that color can be measured and quantified based on the three primary colors, and that all colors in the visible spectrum can be made by mixing these three colors; red, green, and blue. The three colors correspond with the three wavelength sensitivities in normal vision.
The opponent-process theory suggests that each photoreceptor is linked together to form opposing pairs: red-green, blue-yellow, and black-white. Activation of one of the colors in a pair inhibits the opposing color. This theory is similar to the way color is defined in CIELab color space. Each channel is defined by opposing pairs: black-white (L), red-green (a), and yellow-blue (b).
Press enter or click to view image in full size


Interestingly, this theory can be experienced in action by the afterimage illusion. If you’re unfamiliar with this illusion, it goes like this: Stare at one spot of the inverted Mona Lisa for 30 to 60 seconds. As soon as that time has lapsed, look at the white square to the right and blink. For an instant you will see the correctly colored image.
Press enter or click to view image in full size


Stare at the Mona Lisa for 30–60 seconds, then look at the white space to the right and blink
This is caused by the fatigue of the stimulated photoreceptors in your eyes, and is an interesting way to experience the opponent process theory in action.
Colorimetry applies to design in that the tools we use for selecting and modifying color are bound to these systems of measurement. They are actualized in a variety of mathematical models called color spaces.
Color space
Color spaces are different numeric models that humans have created for measuring and quantifying color. When evaluating a color in a different color space, numbers and relationships are different. When looking at a single color this has little effect, since the color’s appearance remains the same.
Press enter or click to view image in full size


Same color represented in a variety of different color spaces
These color spaces have a much bigger impact when you modify, blend, or transition a color through color space (such as darkening or desaturating the color). When you begin modifying colors in different color spaces, the outcomes can vary quite a bit. A common way of transitioning through color spaces in available color libraries (such as Chroma.js and D3-color) is that of linear interpolation.
Interpolation
Interpolation is a method of estimating and creating a varying range of new data points between two known data points. In the case of linear interpolation, it is essentially drawing a straight line between known colors to estimate the values in between.
Press enter or click to view image in full size


This is another way of modifying or transitioning color using two known colors. For example, let’s say we want to blend a deep blue to light orange. Traditionally, a designer would build this gradient in a design tool by selecting individual points and modifying their placement on the gradient. It’s a tedious process where one of the goals of the designer is typically to create a uniform and natural-looking transition between the two colors. If we look at a linear interpolation, we can accomplish a basic transition with just the start and end colors. Linear interpolations between different color spaces will each yield dramatically different results in the color scale.
Press enter or click to view image in full size


Five different color space interpolations between the same blue and orange
Certain color spaces are less related to human perception and more related to a medium-specific color application. For instance, in printing the primaries CMYK (cyan, magenta, yellow, and black) correspond with the set of ink pigments used to create every available color. In painting, the primaries of red, blue, and yellow are often used, and for digital interfaces, we use RGB (red, green, and blue).
Get Nate Baldwin’s stories in your inbox
Join Medium for free to get updates from this writer.

Subscribe

RGB is a color space that works in an additive color process; adding colors increases intensity and becomes closer to white.
Press enter or click to view image in full size


RGB cube, HSL and HSV cylinders: source
RGB is a cubic color space, but has cylindrical models HSL (hue, saturation, lightness) and HSV (hue, saturation, value) for more easily reasoning about the color space. RGB is bound more to the properties of the light (as it’s used to create color on screen) than it is to human perception. So while HSL or HSV may be easier to reason about, they are not perceptually uniform, and working in these spaces can sometimes be problematic.
Color and cartography
A good comparison for interpolation and color spaces is that of cartography and illustrating flight paths. Here we can think of color spaces as being different maps. Interpolations and color steps are essentially the plotting a flight path from one location to another.
Depending on the type of map (color space) you’re looking at, the path may look very different — so much, in fact, that you may see artificial patterns or misinterpret these patterns when compared to human perception of color.

Flight paths from LA to Moscow, an New York to Moscow on a Mercator Projection map. Source: Quara
For example, this map shows the flight path from Los Angeles and New York to Moscow. On this map it looks like the flight from LA to Moscow takes an irrationally large detour around Greenland. But, when we look at the same flight path in a different map, it’s clear that the flight takes a straight path and travels a much shorter distance than we thought.

Source: Quara
The reason for this is because the first map is an improper projection of a three dimensional surface into two dimensional space. There’s a whole lot to read on this specific subject, as it is a very difficult problem.
As we can see with this example, using an improper map to review a path can result in the misinterpretation of the path itself.
Same sort of thinking applies to color. This is why it’s helpful to interpolate within different color spaces and why each yield different results.
Like cartographers, color scientists are continuing to evolve their models for color with color appearance models. These models are adaptations to XYZ color space in order to correct irregularities and create a more accurate model of color based on the perceptual properties of color.
The color appearance model CIECAM02 was used to create the Viridis color scale, which is an industry standard for sequential color in data visualization. The scale in CIECAM02 forms a balanced curve through space, which reflects the balanced appearance and smooth transition of the color scale itself.

Viridis scale (extrapolated to white & black) shown in 3d CIECAM02 color space
Each color space has its own strengths and weaknesses, depending on what you are trying to create. Comparing color space interpolation and color space visualization is an important aspect of auditing and creating a balanced color scale.
Going back to our blue-orange example above, if we take a look at a few of the interpolations in 3d space, we can begin to see why, where, and how the color scale is moving in order to create the different color outputs.
Press enter or click to view image in full size


Blue/orange interpolations in CIECAM02, LCH, and HSL; shown in 3d CIECAM02 color space
Let’s take a look at specifically creating a single-hue value scale for UI. Many designers have observed that when creating a perceptually balanced transition between colors in HSV, they tend to adhere to a curve.
Press enter or click to view image in full size


Single-hue value scale plotted in HSV appears to follow curve
In this process, we are essentially trying to navigate color space. Our goals are not as simple as finding the quickest route, because the nicest route to a destination is not always a straight line. While the curve we created has a nice form, it is not entirely uniform, and may not be straightforward in how to implement the scale.
Let’s take a look at how the same value scale above maps in a variety of other color spaces. If we interpolate additional colors for this scale in HSV, we can see a fuller picture. This color scale takes differently shaped curves when viewed in different color spaces.
Press enter or click to view image in full size


Scale with HSV interpolation shown in RGB, HSV, and CIECAM02 color space
In RGB color space, the scale follows a smooth downward curve with an exponential appearance. In HSV color space, we see the same arc shape that we observed earlier, which has a sharper angle to the curve and some irregularities in the darker colors. When looking at the same color scale in CIECAM02, it appears to have a nice, fairly even convex curve.
So in order to create the same desired color scale, it may be easier to draw a uniform, balanced curve in either RGB or CIECAM02. If we are to look at different colors, we can see that uniformity of curves is not possible in HSV due to the way in which colors are numerically defined in that space. For example, a scale of yellow has uniformity in CIECAM02, but the shapes in RGB and HSV are very different from the blue scale.
Press enter or click to view image in full size


Yellow value scale with non-uniform curves in RGB and HSV compared to CIECAM02 color space
Bringing back the earlier example of interpolating between dark blue and orange, we can see in this graph that LCH interpolation creates a very nice balanced curve in CIECAM02 color space. Depending on our goals, this may be a very appropriate result; such as for use in a sequential scale for data visualization.
Press enter or click to view image in full size


LCH interpolation shown in CIECAM02 color space
How does this affect design?
As designers, it’s helpful to explore various color spaces to see the path the color scale takes through space. By finding the right color space to use, we can find patterns such as curves or linear paths that naturally occur in our color selection. This allows us to make informed modifications to the colors while trying to create a uniform path in color space.
Linear interpolations with color libraries can help to eliminate much of the tedium in creating a color scale. They can also be enhanced to automatically distribute colors by various properties, which can help in creating a uniform scale. However, manual creation of gradients still provides designers with fine control over color selection that these tools do not. Combining these processes and auditing color choices in various color spaces at the time of authoring will allow you to create perceptually balanced scales, using a little bit of color science to help.

Leonardo: an open source contrast-based color generator

Nate Baldwin
Follow
9 min read
·
Dec 10, 2019
1.8K

3



Create beautiful, accessible, and adaptive color systems using contrast-ratio based generated colors. Leonardo now supports full theme generation.

If you’ve created a color palette for a website or app, you’ve probably encountered a few of the challenges in creating color palettes for user interfaces. One of the most common challenges is meeting accessibility criteria such as a minimum contrast ratios defined by the Web Content Accessibility Guidelines (WCAG). Current tools check the contrast between colors after you’ve selected them, or they output a list of combinations of existing colors that meet the requirements. But this can become a tedious game of cat and mouse.
Wouldn’t it be nice if we could just generate colors based on a desired contrast ratio?
Well, now you can.
Introducing Leonardo
Leonardo is an open source tool for creating adaptive color palettes; a custom color generator for creating colors based on target contrast ratio. Leonardo is delivered as a Javascript module (@adobe/leonardo-contrast-colors) with a web interface to aid in creating your color palette configurations, which can easily be shared with both designers and engineers. Simply put, Leonardo is for dynamic accessibility of your products.
Press enter or click to view image in full size


Creating an adaptive color palette
You can start by visiting Leonardocolor.io and enter your “key colors”. These are a list of colors referenced to generate a color lightness scale (from black, to each key color, to white). Much like key frames, key colors are single points in which additional colors will be interpolated.
Press enter or click to view image in full size


Each key color is automatically sorted and placed in your color scale according to its lightness, so the perceptual distribution of color lightnesses is handled automatically (based on HSLuv lightness values). This uniform method of distributing colors helps to equalize the color scale so that you don’t see dramatic shifts in lightnesses as you change or add key colors.
Press enter or click to view image in full size


Key colors placed along scale based on HSLuv lightness
Sometimes a direct path through colorspace does not yield the most appealing colors. Check out this article if you want to learn more on this topic. Adding additional key colors will help to direct the interpolation path in your color scale. As you enter these values, the gradient will update to display the scale you’re creating.
Press enter or click to view image in full size


Another way you can affect the output of your color scale is by selecting which color space to interpolate values. The color scale is generated in LCH color space by default, but you can alternatively use LAB, HSL, HSLuv, HSV, RGB, and even the CIECAM02 color appearance model.
Press enter or click to view image in full size


Interpolation through different color spaces produce different color scales
Depending on the type of color scale you’re creating, and the specific key colors that you input, certain color spaces may work better than others. I’ve written more detail on this and how it can affect color scales and choices in the article Colorimetry and the cartography of color.
The primary differentiator from Leonardo and other color accessibility tools is the contrast ratio swatches.
Press enter or click to view image in full size


Target contrast ratio inputs show generated color swatch beside value for context.
These inputs are where you can define the desired contrast ratio you want to generate for the color you’ve configured. By default, the tool will have two swatches: 3 and 4.5. These conform to the WCAG 2.0 (Level AA) minimum contrast requirements for large text (3:1) and normal text (4.5:1).
A color swatch is generated using the intersection of your desired contrast ratio and color scale. A dot on top of the gradient makes it easy to see the distribution of swatches along the gradient. The generated colors are displayed in the right panel with the hex value and contrast ratio.
Press enter or click to view image in full size


Generated colors shown with hex value and recalculated contrast against the base color
The contrast ratio shown over the generated colors is from a re-evaluation of the generated color against the base color after generation to verify if the generated colors meet your requirements.
Due to the restrictions of RGB colorspace, interpolation methods, and the method of calculating contrast, exact contrast values may not be producible. This post-generation contrast value helps you to identify when a generated color may fall below the minimum requirement, so that you can adjust the target ratio in your contrast swatches and ensure you’re within the required minimums.
Helpful tip: Leonardo can generate bidirectional contrast swatches. When your base color is not pure black or white, negative values will generate colors in the opposing direction. For example, if your base color is light gray and you want to generate lighter values, pass a negative number into your swatches.
Press enter or click to view image in full size


The main body of the Leonardo web app displays simple examples of each generated color as both text over the base color, and as the background color with text that is the base color value. This gives some context to how your colors will appear when used with text or basic UI components.
Under the charts tab is a set of two-dimensional charts displaying the interpolation paths for each channel of your color scale. By default, the charts are shown in CIECAM02 because it is a color space that more accurately represents human perception of color. You have the option to preview charts in any of the supported color spaces independently from the interpolation mode you’ve selected, however CIECAM02 is recommended. Irregularities seen in this color space may help you to identify irregularities in your color scale more accurately.
Get Nate Baldwin’s stories in your inbox
Join Medium for free to get updates from this writer.

Subscribe

These charts are helpful in illustrating areas where you may benefit from adding additional key colors and smoothing the path of your color, as well as identifying the appropriate color space interpolation mode.
Press enter or click to view image in full size


Blue/Yellow curves charted in CIECAM02. Comparison shown with CIECAM02, HSL, and LCH interpolations
Along with the channel interpolation charts is a chart showing the distribution of your contrast ratios. This is helpful to see the difference in contrast between each step that you’re creating. An interesting insight you will see is that when contrasts are evenly spaced on along the color scale, the contrast ratios follow an exponential curve.
Press enter or click to view image in full size


Chart showing contrast swatch distribution
Under the model tab is a three-dimensional model of your color scale in CIECAM02 color space. This 3d preview is another way to see how interpolation through different color spaces affect the generated color values. You may interpolate your colors in one colorspace, but want to see how it’s represented in another.
Press enter or click to view image in full size


Color scale with LAB interpolation shown in the CIECAM02 color space in interactive 3d model
It is recommended, however, that you use CIECAM02 when evaluating your color scale in 3d for the same reasons. For example, if you have a multi-hue color scale, evaluating it in HSV will be particularly difficult, as the curve will make irregular shapes that are not reflective of the perceived color path you are creating. These color spaces are available in the 3d preview as a way of educating and enabling you to visually understand the differences in how color is modeled in these spaces.
Sharing your palette
Since design is a collaborative process, the configurations you make in the app are printed in the URL, making it easy to share your specific configurations with team members. Just copy and paste the URL and your team members will see what you see.
Press enter or click to view image in full size


The custom configurations that you create for your color scale are expressed as parameters in Leonardo’s generateContrastColors() function. When you’re ready to hand over your color configurations to engineers, they can copy and paste your parameters directly.
Press enter or click to view image in full size


Engineers using Leonardo npm module can copy your parameters directly
Leonardo is a tool intended for both designers and engineers. When Leonardo is integrated into your products, it can be used to generate an adaptive color palette, which can act as a brightness and contrast control for your users. It can also be used for generating static color themes.
Migrating to Leonardo
Creating color palettes for design systems is difficult on its own, and there’s no reason you should completely abandon your existing color palette. For that reason, Leonardo makes it easy to make your existing palette an adaptive palette.
To migrate your palette, start by clearing out the key colors and any existing contrast swatches. Then select the “Add bulk” option in the key colors.
Press enter or click to view image in full size


A dialog will appear with a text area for entering multiple color values. Paste in your existing colors (for a single hue) in hex format, separated by either commas or new lines. Select the checkbox labeled “import as swatches” and input the background color of your existing theme as the “base color”. When you click “Add”, each of your existing colors will be added as key colors, and their contrasts will be checked against the base color — each contrast ratio value will be added as a new contrast ratio swatch.
Press enter or click to view image in full size


Importing as swatch will create contrast swatches for each color entered
Now your existing palette is contrast-ratio-based. You can begin modifying your color scale and ratios and share the URL with your engineers to pass along the parameters they’ll need to integrate Leonardo and your adaptive color palette into your product.
Press enter or click to view image in full size


Example of Carbon Design System’s red palette generated by bulk entry
Reimagining inclusive design and color contrast
Leonardo allows you to rethink how to approach accessibility of color contrast in user interface design; putting the control in the hands of your end users and making accessibility dynamic.
There are many people who fall between the needs of minimum contrasts and the needs of using high contrast modes. Whether that’s due to low vision, or a host of technological or environmental factors that affect the appearance of contrast on screen. These users simply need to boost or adjust the brightness or contrast of an interface to aid in their experience.
Press enter or click to view image in full size


Demo app using Leonardo for fully contrast-ratio-based theme and dynamic brightness & contrast controls
By integrating Leonardo into your applications, you effectively enable users to modify the experience to fit their unique needs while upholding the brand and aesthetic of your color choices.
Creating a full contrast-based theme
This article walked you through how to create a single color scale using Leonardo. The tool has since been improved with the ability to create multiple scales at once, all referencing a common background color — in other words, you can now author an entire color theme in one place. Take a look at this article to find out how, or jump right in at https://leonardocolor.io/theme.html
Open source
Inclusive design affects us all, which is why it’s a high priority to make Leonardo an open source project. We want it to be easier for everyone to create accessible color palettes, and enable products to put accessibility and inclusive design in the hands of their end users.
Leonardo is an Adobe open source project, and is being used to generate the color system for Spectrum, Adobe’s design system.
Come take a look at http://www.leonardocolor.io
Or visit on GitHub at https://www.github.com/adobe/leonardo
Contributions welcome! 🎉
Additional credits
Inspiration for Leonardo came from Lindsay Browne, Alan Wilson, and Johnny Hunter. Major thanks to Larry Davis for his invaluable contributions.
It is also inspired by all the work of other designers and engineers who have been making advancement in color tooling and education of colorimetry and color accessibility for user interface design.
Leonardo is built using D3 and additional plugins from the D3 community.



Creating contrast-based themes with Leonardo
A feature enhancement to Leonardo, Adobe’s open-source tool for creating beautiful, accessible, and adaptive color systems using contrast-ratio based generated colors.

Nate Baldwin
Follow
7 min read
·
Feb 28, 2020
561

6



Press enter or click to view image in full size


Recently we launched Adobe’s open-source tool Leonardo with the goal of empowering designers and engineers to create accessible-first color palettes. Since then, we’ve been continuing to evolve Leonardo — the engine that drives the adaptive color theme for Adobe’s design system, Spectrum.
This latest update is for authoring adaptive themes in both the npm module and the web tool. This means building out multiple contrast-based color palettes at once, and each output color being based on its contrast with a shared background.
Press enter or click to view image in full size


Example adaptive theme, based on Spectrum’s colors
Creating an adaptive theme
Start by visiting Leonardocolor.io/theme.html. You can give your theme a name, then add a color scale to your theme. By default, the first color that is added is named “Gray”, and is automatically selected for the base color (used for generating the background color).
Press enter or click to view image in full size


Each color scale that you add will populate the screen with a card for configuring your color. Each of these configurations are the same as what you find in the “Color” tab of Leonardo. The configurations of key colors, colorspace interpolation, contrast ratios, and the bulk import feature are already documented here if you are unfamiliar with how those work. It is worth noting that the contrast ratios in this view are a list of ratios in a single input, rather than multiple inputs per ratio.
If you’re looking for a jumping-off point without building a theme from scratch, here are a few adaptive themes based on existing UI libraries:
Bootstrapper (based on Bootstrap )
Semantically (based on Semantic UI)
Some modifications have been made such as including accessible contrast ratio swatches for colors that did not already meet WCAG AA requirements. None of these adaptive themes are official or endorsed by the libraries they are based upon.
Helpful tip: It’s recommended to use the “Color” tab for creating each of your color scales, since this view provides a more detail for a single color scale, including charts and 3d model for interpolation evaluation as well as both text and UI examples of the color for contextual preview of your generated colors. Click the edit button to open your color scale in a new tab.
Press enter or click to view image in full size


Clicking edit on a color scale will open it in a new tab for isolated editing
Brightness and contrast
A few important additions to this UI are the configuration sliders for default brightness and contrast. There are a few different ways that these sliders can be used:
Setting brightness values for specific themes:
eg. “Light” theme with brightness of 100, “Dark” theme with brightness of 20.
Setting contrast values for specific themes:
eg. “High contrast” theme with contrast value of 3.
Using brightness and contrast for defaults only and allowing users to edit these values within your product:
eg. Leaving brightness and contrast undefined will return your theme as a function such as myTheme(brightness, contrast);
The beauty of using Leonardo in your web product is the ability to enable your end users to control the brightness and contrast of their experience. It’s important to note that impairments to vision are complex, and some of which are either purely environmental, or are exacerbated by environmental factors, leaving users with a need for personalization.
Get Nate Baldwin’s stories in your inbox
Join Medium for free to get updates from this writer.

Subscribe

In fact, the working update to WCAG’s contrast standards (Project Silver) mention personalization many times. At this point, the brightness and contrast sliders in Leonardo are a way to preview and audit your adaptive color system, as well as act as a tool to help you to define maximum contrast value and appropriate value ranges for your light and dark themes.

Demo app using Leonardo for end-user personalization of brightness and contrast (adaptive theme)
How to do this:
Let your engineers know your intent here, because this is an implementation-dependent topic. For engineers, you will define the theme as a variable without any brightness or contrast value passed through the configurations. This will return your theme as a function, which can be integrated with controls for your end users to regenerate the colors in real-time.
Helpful tip: Take a look at Leonardo’s demo app to see an adaptive color theme in action. In order to see how this is accomplished, you can take a look at the source code as well.
Theme outputs
For each color scale in your theme, the right panel will display your generated colors. You can copy individual colors by clicking the swatch, or you can copy all of the colors’ hex codes as a list by clicking the “Copy all” button.
Press enter or click to view image in full size


Copy individual colors or all at once
The right panel also outputs all of the unique configurations that you’ve created as parameters to pass through the Leonardo npm module. Each of these parameters are documented in Leonardo’s contrast-colors package readme. Engineers can click to copy these parameters and pass them directly through the generateAdaptiveTheme function to output the same colors seen in the web tool.
Press enter or click to view image in full size


Engineers using Leonardo npm module can copy your parameters directly
Just as with the previous version of the web tool, the URL is updated with the parameters of your theme configuration so that you can share your theme with your team members. This is helpful for both collaboration and for easier sharing of javascript parameters with your engineers.
Press enter or click to view image in full size


Don’t worry, though; URLs that you’re sharing for the previous version of Leonardo’s web app will continue to work as expected.
Additional helpful features
We’ve included a few extra features to help with the creation and auditing of an entire adaptive color palette in Leonardo.
Import from URL
If you’ve already begun using Leonardo for the creation of your adaptive color palettes, this feature is a short-cut for keeping your existing work.

Press enter or click to view image in full size


Paste your existing Leonardo URL and it will be added to your theme
Views
The default view for theme authoring is the configuration view. This displays the gradient of your color scale and all inputs for configuring each color scale. This is great for inputting values, but not so great for comparing color scales.
The color scales view hides your configurations and allows you to see each color scale gradient side-by-side. This is helpful in evaluating your color scales overall, such as seeing when one color may becomes more saturated than others as it gets lighter or darker.
Press enter or click to view image in full size


The swatches view provides a larger view of your generated colors and places them on top of the background color for additional context. This view is particularly helpful with the next feature, color-vision-deficiency (CVD) previews.
CVD Previews
If you’re unfamiliar with this term, CVD stands for “color-vision-deficiency” — this is the appropriate and more accurate term for “color blindness”.

Press enter or click to view image in full size


This set of options allows you to simulate what your theme looks like in a variety of color vision deficiencies. These include both types of red/green (protan & deutan), yellow/blue (tritan), and full color vision deficiencies (achromatic). I have a brief introduction to these in the article Colorimetry and the Cartography of Color, however for a deeper dive, see Color-Blindness.com.
Press enter or click to view image in full size


CVD simulations will not affect the color values when you copy output colors. This is to help ensure you don’t accidentally copy a simulated color value rather than the actual color output. These simulations are helpful in qualitatively evaluating the identifiability of each individual color of your theme for a wide range of color vision deficiencies.
This update helps you author and implement an adaptive color theme for your product, making personalization of color a reality for your end users.
We would love any feedback, and contributions to Leonardo to help us improve the tool for everyone. Pull requests are welcome!
To log any issues, bugs, improvement requests, and PRs, please visit the repository at: https://github.com/adobe/leonardo
Thank you 🎉
