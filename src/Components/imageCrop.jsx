const imageCrop = (
    image,
    canvas,
    crop
)=>{
    const ctx = canvas.getContext('2d')
    if(!ctx){
        throw new Error ("No 2d Context")
    }

    const pixelRatio = window.devicePixelRatio
    const scaleX = image.naturalWidth 
    const scaleY = image.naturalHeight 

    canvas.width = scaleX
    canvas.height = scaleY

    ctx.scale(pixelRatio, pixelRatio)
    ctx.imageSmoothingQuality = 'high'
    ctx.save()

    ctx.drawImage(
        image,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight
    )


    ctx.restore()
}

export default imageCrop