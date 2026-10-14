import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import { resolve } from 'path'
import fs from 'fs'
import sharp from 'sharp'

// Generate the build directory name
const buildDirName = `landing-${new Date()
  .toISOString()
  .slice(0, 16)
  .replace(/[^0-9]/g, '')}`

// Function to optimize images manually
async function optimizeImage(srcPath, destPath) {
  const ext = srcPath.split('.').pop().toLowerCase()
  
  try {
    if (['jpg', 'jpeg'].includes(ext)) {
      await sharp(srcPath)
        .jpeg({ quality: 85, progressive: true })
        .toFile(destPath)
    } else if (ext === 'png') {
      await sharp(srcPath)
        .png({ quality: 85 })
        .toFile(destPath)
    } else if (ext === 'webp') {
      await sharp(srcPath)
        .webp({ quality: 85 })
        .toFile(destPath)
    } else {
      // Copy non-optimizable files as-is
      fs.copyFileSync(srcPath, destPath)
    }
  } catch (error) {
    console.warn(`Could not optimize ${srcPath}:`, error.message)
    fs.copyFileSync(srcPath, destPath)
  }
}

export default defineConfig({
  plugins: [
    react(),
    ViteImageOptimizer({
      jpeg: { quality: 85, progressive: true },
      jpg: { quality: 85, progressive: true },
      png: { quality: 85 },
      webp: { quality: 85 },
      cache: true,
      includePublic: true,
    }),
    // Enhanced plugin to optimize AND copy public files
    {
      name: 'optimize-and-copy-public',
      async closeBundle() {
        const publicDir = resolve(__dirname, 'public')
        const buildDir = resolve(__dirname, buildDirName)
        
        // Wait for build to complete
        await new Promise(resolve => setTimeout(resolve, 500))
        
        if (!fs.existsSync(publicDir)) {
          console.log('⚠ Public directory not found')
          return
        }
        
        if (!fs.existsSync(buildDir)) {
          console.log(`⚠ Build directory ${buildDirName} not found, waiting...`)
          // Wait a bit more and check again
          await new Promise(resolve => setTimeout(resolve, 1000))
          if (!fs.existsSync(buildDir)) {
            console.log(`❌ Build directory ${buildDirName} still not found`)
            return
          }
        }
        
        console.log(`Optimizing and copying public files to ${buildDirName}/...`)
        
        const processDir = async (src, dest) => {
          const entries = fs.readdirSync(src, { withFileTypes: true })
          
          for (const entry of entries) {
            const srcPath = resolve(src, entry.name)
            const destPath = resolve(dest, entry.name)
            
            if (entry.isDirectory()) {
              if (!fs.existsSync(destPath)) {
                fs.mkdirSync(destPath, { recursive: true })
              }
              await processDir(srcPath, destPath)
            } else {
              const ext = entry.name.split('.').pop().toLowerCase()
              const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']
              
              if (imageExtensions.includes(ext)) {
                console.log(`  🔧 Optimizing: ${entry.name}`)
                await optimizeImage(srcPath, destPath)
              } else {
                // Copy non-image files as-is
                fs.copyFileSync(srcPath, destPath)
                console.log(`  → ${entry.name}`)
              }
            }
          }
        }
        
        await processDir(publicDir, buildDir)
        console.log(`✓ Public files optimized and copied to ${buildDirName}/`)
      }
    }
  ],
  
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp', '**/*.ico', '**/*.bmp', '**/*.mp4', '**/*.webm', '**/*.ogg', '**/*.mp3', '**/*.wav', '**/*.flac', '**/*.aac', '**/*.pdf', '**/*.txt', '**/*.json', '**/*.xml'],
  
  build: {
    outDir: buildDirName,
    
    emptyOutDir: true,
    minify: 'esbuild',
    copyPublicDir: false,
    
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name) {
            const ext = assetInfo.name.split('.').pop()
            const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp']
            
            if (imageExtensions.includes(ext.toLowerCase())) {
              return `assets/[name].[ext]`
            }
          }
          
          return 'assets/[name]-[hash][extname]'
        },
      }
    }
  }
})
