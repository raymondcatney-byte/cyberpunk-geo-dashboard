/**
 * Makaveli Geopolitical Intelligence Agent
 * 
 * Client-side handler for Makaveli queries with globe visualization.
 * Calls serverless endpoint for API key security.
 */

import { globeDataFeed } from './globeDataFeed';

// Types for tool call responses
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface MakaveliResponse {
  content: string;
  tool_calls?: ToolCall[];
}

// Execute tool call and update globe state
export async function executeGlobeTool(toolCall: ToolCall): Promise<boolean> {
  try {
    const args = JSON.parse(toolCall.function.arguments);
    
    switch (toolCall.function.name) {
      case 'highlight_region': {
        // Store focus coordinates in global state for GlobeGL to pick up
        (window as any).__globeFocus = {
          lat: args.latitude,
          lng: args.longitude,
          zoom: args.zoom_level || 6,
          region: args.region_name
        };
        // Trigger custom event for GlobeGL
        window.dispatchEvent(new CustomEvent('globe-focus-change', {
          detail: { region: args.region_name }
        }));
        return true;
      }
      
      case 'show_trade_routes': {
        // Enable trade routes layer
        const activeLayers = globeDataFeed.getState().activeLayers;
        activeLayers.add('tradeRoutes');
        globeDataFeed.setActiveLayers(Array.from(activeLayers));
        
        // Store route preference for styling
        (window as any).__tradeRouteFocus = args.routes;
        window.dispatchEvent(new CustomEvent('trade-routes-highlight', {
          detail: { routes: args.routes, alternatives: args.show_alternatives }
        }));
        return true;
      }
      
      case 'show_conflict_zones': {
        const activeLayers = globeDataFeed.getState().activeLayers;
        activeLayers.add('conflicts');
        globeDataFeed.setActiveLayers(Array.from(activeLayers));
        
        (window as any).__conflictFilter = {
          regions: args.regions || [],
          severity: args.severity_threshold || 'high'
        };
        return true;
      }
      
      case 'show_resource_flows': {
        const activeLayers = globeDataFeed.getState().activeLayers;
        activeLayers.add('tradeRoutes');
        globeDataFeed.setActiveLayers(Array.from(activeLayers));
        
        (window as any).__resourceFlow = {
          type: args.resource_type,
          origin: args.origin_region,
          destination: args.destination_region
        };
        return true;
      }
      
      case 'show_maritime_activity': {
        const activeLayers = globeDataFeed.getState().activeLayers;
        activeLayers.add('vessels');
        globeDataFeed.setActiveLayers(Array.from(activeLayers));
        
        (window as any).__maritimeFocus = {
          region: args.region,
          showReroutes: args.show_reroutes
        };
        return true;
      }
      
      case 'show_aircraft_activity': {
        const activeLayers = globeDataFeed.getState().activeLayers;
        activeLayers.add('flights');
        globeDataFeed.setActiveLayers(Array.from(activeLayers));
        
        (window as any).__aircraftFocus = {
          region: args.region,
          showSurge: args.show_surge_pattern
        };
        return true;
      }
      
      case 'show_censorship_patterns': {
        const activeLayers = globeDataFeed.getState().activeLayers;
        activeLayers.add('cyber');
        globeDataFeed.setActiveLayers(Array.from(activeLayers));
        
        (window as any).__censorshipFocus = {
          countries: args.countries || []
        };
        return true;
      }
      
      case 'clear_globe_focus': {
        (window as any).__globeFocus = null;
        (window as any).__tradeRouteFocus = null;
        (window as any).__conflictFilter = null;
        globeDataFeed.setActiveLayers(['tradeRoutes']); // Reset to default
        window.dispatchEvent(new CustomEvent('globe-clear-focus'));
        return true;
      }
      
      default:
        console.warn('[Makaveli] Unknown tool:', toolCall.function.name);
        return false;
    }
  } catch (error) {
    console.error('[Makaveli] Tool execution error:', error);
    return false;
  }
}

// Main Makaveli query function
export async function queryMakaveli(
  userQuery: string,
  context?: {
    recentEvents?: string[];
    activeRegions?: string[];
  }
): Promise<MakaveliResponse> {
  
  const response = await fetch('/api/groq', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: userQuery,
      mode: 'makaveli',
      context
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Makaveli API error');
  }

  const data = await response.json();
  
  return {
    content: data.content || '',
    tool_calls: data.tool_calls
  };
}
