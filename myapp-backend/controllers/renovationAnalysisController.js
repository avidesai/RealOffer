// renovationAnalysisController.js

const axios = require('axios');
const PropertyListing = require('../models/PropertyListing');
const RenovationAnalysis = require('../models/RenovationAnalysis');
const sharp = require('sharp');

// Helper function to compress and resize images
const compressImage = async (imageBuffer) => {
  try {
    const compressed = await sharp(imageBuffer)
      .resize(400, 300, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 50, progressive: true })
      .toBuffer();
    return compressed;
  } catch (error) {
    console.error('Error compressing image:', error);
    return imageBuffer; // Return original if compression fails
  }
};

// Helper function to convert image to base64
const imageToBase64 = async (imageUrl) => {
  try {
    console.log('Processing image URL:', imageUrl);
    
    // Add timeout and better error handling
    const response = await axios.get(imageUrl, { 
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
      maxContentLength: 10 * 1024 * 1024 // 10MB max
    });
    
    if (!response.data || response.data.length === 0) {
      console.error('Empty response data for image:', imageUrl);
      return null;
    }
    
    const compressed = await compressImage(Buffer.from(response.data));
    
    // Check if compressed image is too large (Claude has limits)
    if (compressed.length > 5 * 1024 * 1024) { // 5MB limit
      console.warn('Compressed image still too large, skipping:', imageUrl);
      return null;
    }
    
    const base64String = compressed.toString('base64');
    return `data:image/jpeg;base64,${base64String}`;
  } catch (error) {
    console.error('Error converting image to base64:', error.message);
    return null;
  }
};

// Helper function to process photos in batches
const processPhotosInBatches = async (photoUrls, batchSize = 3) => {
  console.log(`Processing ${photoUrls.length} photos in batches of ${batchSize}`);
  
  const batches = [];
  for (let i = 0; i < photoUrls.length; i += batchSize) {
    batches.push(photoUrls.slice(i, i + batchSize));
  }
  
  const processedBatches = [];
  for (let i = 0; i < batches.length; i++) {
    console.log(`Processing batch ${i + 1}/${batches.length} with ${batches[i].length} photos`);
    const batch = batches[i];
    
    // Process images sequentially to avoid overwhelming the system
    const processedBatch = [];
    for (const url of batch) {
      const processed = await imageToBase64(url);
      if (processed) {
        processedBatch.push(processed);
      }
      // Small delay between processing images
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (processedBatch.length > 0) {
      processedBatches.push(processedBatch);
    }
  }
  
  console.log(`Successfully processed ${processedBatches.length} batches`);
  return processedBatches;
};

// Generate renovation estimate using Claude Haiku
exports.generateRenovationEstimate = async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    // Get property details
    const property = await PropertyListing.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Check if user has access to this property
    const isCreator = property.createdBy.toString() === req.user.id;
    const isAgent = property.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = property.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to access this property' });
    }
    
    // Check if photos exist
    if (!property.imagesUrls || property.imagesUrls.length === 0) {
      return res.status(400).json({ message: 'No photos available for renovation analysis' });
    }
    
    // Create or update renovation analysis record
    let renovationAnalysis = await RenovationAnalysis.findOne({ propertyId });
    if (!renovationAnalysis) {
      renovationAnalysis = new RenovationAnalysis({
        propertyId,
        propertyLocation: {
          city: property.homeCharacteristics.city,
          state: property.homeCharacteristics.state,
          zipCode: property.homeCharacteristics.zip
        }
      });
    }
    
    // Update status to processing
    renovationAnalysis.status = 'processing';
    renovationAnalysis.processingDetails = {
      photosProcessed: 0,
      totalPhotos: property.imagesUrls.length,
      startedAt: new Date()
    };
    await renovationAnalysis.save();
    
    // Process photos in batches
    const photoBatches = await processPhotosInBatches(property.imagesUrls);
    
    // Check if we have any processed photos
    if (photoBatches.length === 0 || photoBatches.every(batch => batch.length === 0)) {
      console.log('No photos could be processed, creating fallback estimate');
      // Create fallback estimate without AI analysis
      const fallbackBreakdown = [
        {
          category: 'Kitchen',
          estimatedCost: 15000,
          description: 'Basic kitchen renovation estimate',
          condition: 'Fair',
          renovationNeeded: true,
          notes: 'Fallback estimate - photos could not be processed',
          priority: 'Medium'
        },
        {
          category: 'Bathrooms',
          estimatedCost: 8000,
          description: 'Basic bathroom renovation estimate',
          condition: 'Fair',
          renovationNeeded: true,
          notes: 'Fallback estimate - photos could not be processed',
          priority: 'Medium'
        },
        {
          category: 'Flooring',
          estimatedCost: 5000,
          description: 'Basic flooring replacement estimate',
          condition: 'Fair',
          renovationNeeded: true,
          notes: 'Fallback estimate - photos could not be processed',
          priority: 'Low'
        },
        {
          category: 'Paint',
          estimatedCost: 3000,
          description: 'Basic interior painting estimate',
          condition: 'Fair',
          renovationNeeded: true,
          notes: 'Fallback estimate - photos could not be processed',
          priority: 'Low'
        },
        {
          category: 'Landscaping',
          estimatedCost: 2000,
          description: 'Basic landscaping estimate',
          condition: 'Fair',
          renovationNeeded: true,
          notes: 'Fallback estimate - photos could not be processed',
          priority: 'Low'
        },
        {
          category: 'Exterior',
          estimatedCost: 4000,
          description: 'Basic exterior maintenance estimate',
          condition: 'Fair',
          renovationNeeded: true,
          notes: 'Fallback estimate - photos could not be processed',
          priority: 'Medium'
        },
        {
          category: 'Other',
          estimatedCost: 1000,
          description: 'Miscellaneous renovation costs',
          condition: 'Fair',
          renovationNeeded: true,
          notes: 'Fallback estimate - photos could not be processed',
          priority: 'Low'
        }
      ];
      
      const totalCost = fallbackBreakdown.reduce((sum, item) => sum + item.estimatedCost, 0);
      
      // Update renovation analysis with fallback results
      renovationAnalysis.renovationEstimate = {
        totalEstimatedCost: totalCost,
        breakdown: fallbackBreakdown,
        summary: 'Fallback renovation estimate created due to processing issues. Please try again later for AI-powered analysis.',
        lastUpdated: new Date()
      };
      renovationAnalysis.status = 'completed';
      renovationAnalysis.processingDetails.completedAt = new Date();
      await renovationAnalysis.save();
      
      return res.json({
        message: 'Fallback renovation estimate generated',
        renovationEstimate: renovationAnalysis.renovationEstimate,
        status: renovationAnalysis.status
      });
    }
    
    // Prepare the prompt for Claude Haiku
    const locationInfo = `${property.homeCharacteristics.city}, ${property.homeCharacteristics.state} ${property.homeCharacteristics.zip}`;
    const propertyInfo = `${property.homeCharacteristics.beds} bed, ${property.homeCharacteristics.baths} bath, ${property.homeCharacteristics.squareFootage} sqft`;
    
    const systemPrompt = `You are a professional home renovation estimator with expertise in local market costs and property valuation. Analyze the provided property photos and provide a detailed renovation cost estimate.

IMPORTANT: Use the specific location provided to give accurate local market estimates.

Location: ${locationInfo}
Property: ${propertyInfo}

Provide estimates for the following categories:
- Kitchen
- Bathrooms
- Flooring
- Paint
- Landscaping
- Exterior
- Other

CRITICAL ASSESSMENT GUIDELINES - BE EXTREMELY CONSERVATIVE:

1. **MOVE-IN READY STANDARD**: Only suggest renovations if the property would NOT be considered "move-in ready" for most buyers. If a room/area looks clean, functional, and reasonably modern, DO NOT suggest renovation.

2. **CONDITION ASSESSMENT CRITERIA**:
   - "New" = Recently renovated/updated (within last 3 years) with modern finishes
   - "Excellent" = Very good condition, modern features, no visible wear (within last 8 years)
   - "Good" = Minor wear but still in good condition, functional and presentable
   - "Fair" = Moderate wear, some outdated features, but still functional
   - "Poor" = Significant wear, damage, or very outdated features that affect livability

3. **RENOVATION NEED ASSESSMENT - EXTREMELY CONSERVATIVE**:
   - Only mark renovationNeeded = true if there are CLEAR issues that would:
     * Prevent the property from being move-in ready
     * Significantly impact resale value
     * Create safety or functionality problems
     * Show obvious signs of damage, severe wear, or extreme outdatedness
   
   - DO NOT suggest renovation for:
     * Cosmetic preferences (different style, color choices)
     * "Could be improved" scenarios
     * Modern, functional, clean areas
     * Areas that are simply not "trendy" but are in good condition

4. **MARKET CONTEXT CONSIDERATIONS**:
   - Consider the property's price point and market segment
   - Higher-end properties may have higher standards
   - Starter homes should be assessed more leniently
   - Focus on functionality and livability over luxury upgrades

5. **SPECIFIC CATEGORY GUIDELINES**:
   - **Kitchen**: Only renovate if appliances are broken, cabinets are damaged, or layout is severely dysfunctional
   - **Bathrooms**: Only renovate if fixtures are broken, there's water damage, or severe mold issues
   - **Flooring**: Only replace if damaged, severely stained, or unsafe
   - **Paint**: Only repaint if walls are severely damaged, stained, or have peeling paint
   - **Landscaping**: Only renovate if yard is severely overgrown, unsafe, or has drainage issues
   - **Exterior**: Only renovate if there's structural damage, severe wear, or safety issues

6. **PRIORITY ASSESSMENT**:
   - "High" = Safety issues, structural problems, or severe damage
   - "Medium" = Significant wear that affects functionality or appearance
   - "Low" = Minor cosmetic issues or outdated features
   - "None" = No renovation needed

For each category, assess:
1. Current condition (New/Excellent/Good/Fair/Poor)
2. Whether renovation is needed (be extremely conservative)
3. Estimated cost for renovation (use local market rates for ${locationInfo})
4. Brief description of work needed (if any)
5. Priority level (High/Medium/Low/None)

If a category is in excellent, good, or new condition and doesn't need renovation, mark renovationNeeded as false and estimatedCost as 0.

Consider local market costs for ${locationInfo} when providing estimates.

Please provide your response in the following JSON format:
{
  "breakdown": [
    {
      "category": "Kitchen",
      "estimatedCost": 0,
      "description": "Kitchen appears recently updated with modern appliances and finishes",
      "condition": "Excellent",
      "renovationNeeded": false,
      "notes": "No renovation needed - kitchen is in excellent condition",
      "priority": "None"
    }
  ]
}`;

    // Process each batch and combine results
    let allBreakdowns = [];
    let failedBatches = 0;
    const maxFailedBatches = 3; // Stop if too many batches fail
    
    for (let i = 0; i < photoBatches.length; i++) {
      const batch = photoBatches[i];
      if (batch.length === 0) continue;
      
      // Stop processing if too many batches have failed
      if (failedBatches >= maxFailedBatches) {
        console.log(`Stopping processing - ${failedBatches} batches failed`);
        break;
      }
      
      const userMessage = `Please analyze these ${batch.length} photos of the property and provide renovation estimates in JSON format.`;
      
      const messages = [
        { 
          role: 'user', 
          content: [
            { type: 'text', text: userMessage },
            ...batch.map(img => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img.split(',')[1] } }))
          ]
        }
      ];
      
      try {
        console.log(`Sending batch ${i + 1} to Claude API with ${batch.length} images`);
        
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
          model: 'claude-3-haiku-20240307',
          max_tokens: 4000,
          system: systemPrompt,
          messages: messages
        }, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          timeout: 60000 // Reduced timeout to 60 seconds
        });
        
        console.log('Claude API response received successfully');
        
        // Parse the response to extract renovation breakdown
        const content = response.data.content[0].text;
        const breakdown = parseRenovationBreakdown(content);
        allBreakdowns.push(...breakdown);
        
        // Update progress
        renovationAnalysis.processingDetails.photosProcessed += batch.length;
        await renovationAnalysis.save();
        
      } catch (error) {
        console.error('Error processing photo batch:', error.message);
        failedBatches++;
        
        // If it's a timeout or 400 error, try with single images
        if ((error.code === 'ECONNABORTED' || error.response?.status === 400) && batch.length > 1) {
          console.log('Retrying with single images due to timeout or 400 error...');
          
          let singleImageSuccess = false;
          // Try processing images one by one
          for (const img of batch) {
            try {
              console.log('Processing single image...');
              const singleResponse = await axios.post('https://api.anthropic.com/v1/messages', {
                model: 'claude-3-haiku-20240307',
                max_tokens: 4000,
                system: systemPrompt,
                messages: [
                  { 
                    role: 'user', 
                    content: [
                      { type: 'text', text: 'Please analyze this photo of the property and provide renovation estimates in JSON format.' },
                      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img.split(',')[1] } }
                    ]
                  }
                ]
              }, {
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': process.env.CLAUDE_API_KEY,
                  'anthropic-version': '2023-06-01'
                },
                timeout: 45000 // 45 second timeout for single images
              });
              
              console.log('Single image processed successfully');
              const content = singleResponse.data.content[0].text;
              const breakdown = parseRenovationBreakdown(content);
              allBreakdowns.push(...breakdown);
              
              renovationAnalysis.processingDetails.photosProcessed += 1;
              await renovationAnalysis.save();
              singleImageSuccess = true;
              
              // Small delay between single image requests
              await new Promise(resolve => setTimeout(resolve, 1000));
              
            } catch (singleError) {
              console.error('Error processing single image:', singleError.message);
              // Continue with other images even if one fails
            }
          }
          
          // If we had some success with single images, don't count this as a failed batch
          if (singleImageSuccess) {
            failedBatches--;
          }
        } else {
          // For other errors, log but continue
          console.error('Error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
          });
        }
      }
    }
    
    // Combine and aggregate results from all batches
    let finalBreakdown = aggregateRenovationResults(allBreakdowns);
    
    // Check if we have any breakdown data
    if (finalBreakdown.length === 0) {
      console.log('No AI analysis data available, creating fallback estimate');
      
      // Update status to indicate fallback was used
      renovationAnalysis.status = 'completed';
      renovationAnalysis.processingDetails.completedAt = new Date();
      renovationAnalysis.processingDetails.errorMessage = 'AI analysis failed, using fallback estimate';
      await renovationAnalysis.save();
      
      // Create a basic fallback estimate
      finalBreakdown = [
        {
          category: 'Kitchen',
          estimatedCost: 15000,
          description: 'Basic kitchen renovation estimate',
          condition: 'Fair',
          renovationNeeded: true,
          notes: 'Fallback estimate - AI analysis unavailable',
          priority: 'Medium'
        },
        {
          category: 'Bathrooms',
          estimatedCost: 8000,
          description: 'Basic bathroom renovation estimate',
          condition: 'Fair',
          renovationNeeded: true,
          notes: 'Fallback estimate - AI analysis unavailable',
          priority: 'Medium'
        },
        {
          category: 'Flooring',
          estimatedCost: 5000,
          description: 'Basic flooring replacement estimate',
          condition: 'Fair',
          renovationNeeded: true,
          notes: 'Fallback estimate - AI analysis unavailable',
          priority: 'Low'
        },
        {
          category: 'Paint',
          estimatedCost: 3000,
          description: 'Basic interior painting estimate',
          condition: 'Fair',
          renovationNeeded: true,
          notes: 'Fallback estimate - AI analysis unavailable',
          priority: 'Low'
        },
        {
          category: 'Landscaping',
          estimatedCost: 2000,
          description: 'Basic landscaping estimate',
          condition: 'Fair',
          renovationNeeded: true,
          notes: 'Fallback estimate - AI analysis unavailable',
          priority: 'Low'
        },
        {
          category: 'Exterior',
          estimatedCost: 4000,
          description: 'Basic exterior maintenance estimate',
          condition: 'Fair',
          renovationNeeded: true,
          notes: 'Fallback estimate - AI analysis unavailable',
          priority: 'Medium'
        },
        {
          category: 'Other',
          estimatedCost: 1000,
          description: 'Miscellaneous renovation costs',
          condition: 'Fair',
          renovationNeeded: true,
          notes: 'Fallback estimate - AI analysis unavailable',
          priority: 'Low'
        }
      ];
    }
    
    const totalCost = finalBreakdown.reduce((sum, item) => sum + item.estimatedCost, 0);
    
    // Update renovation analysis with results
    renovationAnalysis.renovationEstimate = {
      totalEstimatedCost: totalCost,
      breakdown: finalBreakdown,
      summary: generateRenovationSummary(finalBreakdown),
      lastUpdated: new Date()
    };
    renovationAnalysis.status = 'completed';
    renovationAnalysis.processingDetails.completedAt = new Date();
    await renovationAnalysis.save();
    
    res.json({
      message: 'Renovation estimate generated successfully',
      renovationEstimate: renovationAnalysis.renovationEstimate,
      status: renovationAnalysis.status
    });
    
  } catch (error) {
    console.error('Error generating renovation estimate:', error);
    
    // Update status to failed if we have a renovation analysis record
    if (req.params.propertyId) {
      await RenovationAnalysis.findOneAndUpdate(
        { propertyId: req.params.propertyId },
        { 
          status: 'failed',
          'processingDetails.errorMessage': error.message
        }
      );
    }
    
    res.status(500).json({
      message: 'Error generating renovation estimate',
      error: error.message
    });
  }
};

// Helper function to parse renovation breakdown from Claude response
const parseRenovationBreakdown = (content) => {
  try {
    console.log('Parsing AI response:', content.substring(0, 500) + '...');
    
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.breakdown && Array.isArray(parsed.breakdown)) {
          console.log('Successfully parsed JSON breakdown with', parsed.breakdown.length, 'items');
          return parsed.breakdown.map(item => {
            // Handle unexpected categories by mapping them to 'Other'
            const validCategories = ['Kitchen', 'Bathrooms', 'Flooring', 'Paint', 'Landscaping', 'Exterior', 'Other'];
            const category = validCategories.includes(item.category) ? item.category : 'Other';
            
            return {
              category: category,
              estimatedCost: item.estimatedCost || 0,
              description: item.description || '',
              condition: item.condition || 'Fair',
              renovationNeeded: item.renovationNeeded || false,
              notes: item.notes || '',
              priority: item.priority || 'None'
            };
          });
        }
      } catch (jsonError) {
        console.error('Error parsing JSON:', jsonError);
      }
    }
    
    // Fallback: extract categories and costs from text
    const breakdown = [];
    const categoryMatches = content.match(/(?:^|\n)([A-Za-z\s]+):\s*\$\s*([0-9,]+)/g);
    
    if (categoryMatches) {
      console.log('Using fallback text parsing, found', categoryMatches.length, 'matches');
      categoryMatches.forEach(match => {
        const [category, costStr] = match.split(':').map(s => s.trim());
        const cost = parseInt(costStr.replace(/[$,]/g, ''));
        
        breakdown.push({
          category: category,
          estimatedCost: cost,
          condition: 'Fair',
          renovationNeeded: cost > 0,
          notes: '',
          priority: cost > 10000 ? 'High' : cost > 5000 ? 'Medium' : 'Low'
        });
      });
    }
    
    console.log('Final breakdown items:', breakdown.length);
    return breakdown;
  } catch (error) {
    console.error('Error parsing renovation breakdown:', error);
    return [];
  }
};

// Helper function to aggregate results from multiple batches
const aggregateRenovationResults = (breakdowns) => {
  const aggregated = {};
  
  breakdowns.forEach(item => {
    if (!aggregated[item.category]) {
      aggregated[item.category] = { ...item };
    } else {
      // Take the higher cost estimate if there are conflicts
      if (item.estimatedCost > aggregated[item.category].estimatedCost) {
        aggregated[item.category] = { ...item };
      }
    }
  });
  
  return Object.values(aggregated);
};

// Helper function to generate summary
const generateRenovationSummary = (breakdown) => {
  const totalCost = breakdown.reduce((sum, item) => sum + item.estimatedCost, 0);
  const categoriesNeedingRenovation = breakdown.filter(item => item.renovationNeeded);
  const highPriorityItems = breakdown.filter(item => item.priority === 'High' && item.renovationNeeded);
  
  let summary = `Total estimated renovation cost: $${totalCost.toLocaleString()}. `;
  
  if (categoriesNeedingRenovation.length === 0) {
    summary += "Excellent news! This property appears to be in move-in ready condition with no major renovations needed.";
  } else {
    summary += `${categoriesNeedingRenovation.length} categories require attention. `;
    
    if (highPriorityItems.length > 0) {
      summary += `${highPriorityItems.length} high-priority items identified. `;
    }
  }
  
  // Add market positioning insight
  const moveInReady = categoriesNeedingRenovation.length === 0;
  const minorRenovations = categoriesNeedingRenovation.length <= 2 && totalCost < 15000;
  const majorRenovations = totalCost > 30000;
  
  if (moveInReady) {
    summary += "This property is well-positioned for immediate sale or rental.";
  } else if (minorRenovations) {
    summary += "Minor renovations could enhance market appeal and value.";
  } else if (majorRenovations) {
    summary += "Significant renovations may be needed to maximize market value.";
  }
  
  return summary;
};

// Get renovation estimate
exports.getRenovationEstimate = async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    const renovationAnalysis = await RenovationAnalysis.findOne({ propertyId });
    
    if (!renovationAnalysis) {
      return res.status(404).json({ message: 'Renovation analysis not found' });
    }
    
    res.json({
      renovationEstimate: renovationAnalysis.renovationEstimate,
      status: renovationAnalysis.status,
      processingDetails: renovationAnalysis.processingDetails
    });
    
  } catch (error) {
    console.error('Error fetching renovation estimate:', error);
    res.status(500).json({
      message: 'Error fetching renovation estimate',
      error: error.message
    });
  }
};

// Trigger renovation analysis when photos are updated
exports.triggerRenovationAnalysis = async (propertyId) => {
  try {
    console.log(`Triggering renovation analysis for property: ${propertyId}`);
    
    // Find existing renovation analysis
    let renovationAnalysis = await RenovationAnalysis.findOne({ propertyId });
    
    if (renovationAnalysis) {
      // Reset status to trigger regeneration
      renovationAnalysis.status = 'pending';
      renovationAnalysis.processingDetails = {
        photosProcessed: 0,
        totalPhotos: 0,
        startedAt: null,
        completedAt: null
      };
      await renovationAnalysis.save();
    }
    
    // The actual analysis will be triggered when the user requests it
    console.log(`Renovation analysis reset for property: ${propertyId}`);
    
  } catch (error) {
    console.error('Error triggering renovation analysis:', error);
  }
};
