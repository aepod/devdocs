<?php

namespace Gene\BlueFoot\Block;

/**
 * Class Assets
 *
 * @package Gene\BlueFoot\Block
 *
 * @author Dave Macaulay <dave@gene.co.uk>
 */
class Assets extends \Magento\Backend\Block\AbstractBlock
{
    /**
     * @var \Magento\Framework\View\Page\Config
     */
    protected $pageConfig;

    /**
     * @var \Gene\BlueFoot\Model\Config\ConfigInterface
     */
    protected $configInterface;

    /**
     * Assets constructor.
     *
     * @param \Magento\Backend\Block\Context              $context
     * @param \Magento\Framework\View\Page\Config         $pageConfig
     * @param \Gene\BlueFoot\Model\Config\ConfigInterface $configInterface
     */
    public function __construct(
        \Magento\Backend\Block\Context $context,
        \Magento\Framework\View\Page\Config $pageConfig,
        \Gene\BlueFoot\Model\Config\ConfigInterface $configInterface,
        array $data = []
    ) {
        $this->pageConfig = $pageConfig;
        $this->configInterface = $configInterface;
        parent::__construct($context, $data);
    }

    /**
     * Include our assets in the head
     *
     * @return $this
     */
    protected function _construct()
    {
        $templates = $this->configInterface->getTemplates();
        $assets = [];
        foreach ($templates as $template) {
            if (isset($template['assets'])) {
                $assets = array_merge($assets, array_values($template['assets']));
            }
        }

        // Do we have any assets to load
        if (!empty($assets)) {
            $assets = array_unique($assets);
            foreach ($assets as $asset) {
                $this->pageConfig->addPageAsset($asset);
            }
        }

        return $this;
    }

}